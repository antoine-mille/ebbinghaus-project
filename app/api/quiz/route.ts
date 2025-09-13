import { NextRequest } from "next/server";
import { z } from "zod";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

const QuestionSchema = z.object({
  id: z.string().min(1).optional(),
  prompt: z.string().min(1),
  options: z.array(z.string().min(1)).min(4).max(4),
  correct: z.number().int().min(0).max(3),
});

const QuizSchema = z.object({
  questions: z.array(QuestionSchema).min(3).max(12),
});

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY manquant côté serveur" }),
      { status: 501, headers: { "content-type": "application/json" } }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON invalide" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const CourseInput = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
  });
  const parsed = CourseInput.safeParse(body?.course);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Paramètres invalides" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const { id, name, description } = parsed.data;

  // Define a strict JSON schema for the quiz using JSON Schema spec
  const quizJsonSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      questions: {
        type: "array",
        minItems: 3,
        maxItems: 10,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            prompt: { type: "string", description: "Énoncé de la question" },
            options: {
              type: "array",
              minItems: 4,
              maxItems: 4,
              items: { type: "string" },
              description: "Liste de 4 propositions de réponse",
            },
            correct: {
              type: "integer",
              minimum: 0,
              maximum: 3,
              description: "Index (0..3) de la bonne réponse dans options",
            },
          },
          required: ["prompt", "options", "correct"],
        },
      },
    },
    required: ["questions"],
  } as const;

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-2024-11-20",
      temperature: 0.4,
      max_tokens: 2048,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "quiz",
          strict: true,
          schema: quizJsonSchema,
        },
      },
      messages: [
        {
          role: "system",
          content:
            "Tu es un générateur de QCM pour le CRPE. Réponds uniquement avec un JSON strict conforme au schéma fourni (questions: [{id?, prompt, options[4], correct}]). Les distracteurs doivent être plausibles et le français clair.",
        },
        {
          role: "user",
          content: [
            `Cours: ${name}`,
            description ? `Description: ${description}` : undefined,
            "Consignes:",
            "- Génère 3 à 6 questions",
            "- 4 propositions par question, 1 seule correcte",
            "- Pas de markdown ni HTML, uniquement du texte brut",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    });

    // Extract JSON content from SDK response
    const msg = completion.choices?.[0]?.message as any;
    let contentStr: string | undefined;
    if (typeof msg?.content === "string") contentStr = msg.content;
    else if (Array.isArray(msg?.content)) {
      const textPart = msg.content.find(
        (p: any) => p?.type === "text" && typeof p.text === "string"
      );
      contentStr =
        textPart?.text ??
        msg.content
          .map((p: any) => p.text)
          .filter(Boolean)
          .join("\n");
    }
    if (!contentStr) {
      return new Response(JSON.stringify({ error: "Réponse inattendue" }), {
        status: 502,
        headers: { "content-type": "application/json" },
      });
    }
    let json: any;
    try {
      json = JSON.parse(contentStr);
    } catch {
      return new Response(
        JSON.stringify({ error: "JSON non valide renvoyé par le modèle" }),
        {
          status: 502,
          headers: { "content-type": "application/json" },
        }
      );
    }
    const result = QuizSchema.safeParse(json);
    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: "Structure invalide",
          issues: result.error.issues,
        }),
        {
          status: 422,
          headers: { "content-type": "application/json" },
        }
      );
    }
    // Ensure IDs
    const withIds = {
      questions: result.data.questions.map((q, i) => ({
        id: q.id && q.id.length > 0 ? q.id : `${i + 1}`,
        prompt: q.prompt,
        options: q.options.slice(0, 4),
        correct: Math.max(0, Math.min(q.correct, 3)),
      })),
    };
    return new Response(JSON.stringify(withIds), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    const status = e?.status ?? 500;
    const details = e?.error ?? e?.message ?? "unknown";
    console.error("OpenAI error:", JSON.stringify(e, null, 2));
    return new Response(JSON.stringify({ error: "Erreur OpenAI", details }), {
      status: status === 400 ? 400 : 500,
      headers: { "content-type": "application/json" },
    });
  }
}
