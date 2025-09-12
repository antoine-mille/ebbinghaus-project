"use client";
import { useEffect, useState } from "react";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
import { Progress } from "@heroui/progress";
import { RadioGroup, Radio } from "@heroui/radio";
import { quizProvider, type Quiz } from "@/lib/quizProvider";
import { addQuizAttempt, completeQuizAttempt } from "@/db";

export function QuizRunner({
  course,
  onFinish,
}: {
  course: { id: string; name: string; description?: string };
  onFinish: (result: {
    aiScore: number;
    userOutcome: "success" | "fail";
  }) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [scored, setScored] = useState<{ aiScore: number } | null>(null);
  const [decision, setDecision] = useState<"success" | "fail" | null>(null);
  const [judged, setJudged] = useState<Record<string, "correct" | "incorrect">>(
    {}
  );
  const [justCorrect, setJustCorrect] = useState(false);
  const [justWrong, setJustWrong] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const id = crypto.randomUUID();
      setAttemptId(id);
      await addQuizAttempt({
        id,
        courseId: course.id,
        startedAt: new Date(),
      });
      const q = await quizProvider.generate(course);
      if (mounted) setQuiz(q);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [course.id]);

  if (loading || !quiz) {
    return (
      <div className="flex items-center justify-center h-40">
        <Spinner label="Génération du quiz..." />
      </div>
    );
  }

  async function validateAll() {
    if (!quiz) return;
    const a = Object.entries(answers).map(([questionId, optionIndex]) => ({
      questionId,
      optionIndex,
    }));
    const score = await quizProvider.score(a, quiz);
    setScored({ aiScore: score });
    if (attemptId) {
      await completeQuizAttempt(attemptId, { aiScore: score });
    }
  }

  function validateCurrent() {
    if (!quiz) return;
    const q = quiz.questions[current];
    const sel = answers[q.id];
    if (sel === undefined) return;
    const ok = sel === q.correct;
    setJudged((prev) => ({ ...prev, [q.id]: ok ? "correct" : "incorrect" }));
    if (ok) {
      setJustCorrect(true);
      setTimeout(() => setJustCorrect(false), 650);
    } else {
      setJustWrong(true);
      setTimeout(() => setJustWrong(false), 350);
    }
    // Compute score automatically on last question when answered
    if (current === total - 1) {
      const allAnswered = quiz.questions.every(
        (qq) => answers[qq.id] !== undefined
      );
      if (allAnswered) void validateAll();
    }
  }

  function finalize(outcome: "success" | "fail") {
    setDecision(outcome);
    onFinish({ aiScore: scored?.aiScore ?? 0, userOutcome: outcome });
  }

  const total = quiz.questions.length;
  const percent = Math.round(((current + 1) / total) * 100);
  const q = quiz.questions[current];
  const selected = answers[q.id];

  return (
    <Card>
      <CardBody className="grid gap-4">
        <div className="flex items-center gap-3">
          <Progress
            size="sm"
            value={percent}
            aria-label="Progression"
            className="flex-1"
          />
          <span className="text-xs text-default-500">
            {current + 1}/{total}
          </span>
        </div>

        {!scored ? (
          <>
            <div className="grid gap-3 text-center">
              <p
                className={`text-base font-medium rounded-medium px-2 py-1 ${justCorrect ? "quiz-animate-flash-correct" : ""} ${justWrong ? "quiz-animate-shake" : ""}`}
              >
                {q.prompt}
              </p>
            </div>
            <RadioGroup
              value={selected?.toString() ?? ""}
              onValueChange={(val) => {
                const idx = Number(val);
                setAnswers((prev) => ({ ...prev, [q.id]: idx }));
              }}
              className="gap-3"
            >
              {q.options.map((opt, idx) => (
                <Radio
                  key={idx}
                  value={idx.toString()}
                  isDisabled={judged[q.id] !== undefined}
                >
                  <span className="ml-3">{opt}</span>
                </Radio>
              ))}
            </RadioGroup>

            <div className="flex items-center justify-between">
              <Button
                variant="flat"
                isDisabled={current === 0}
                onPress={() => setCurrent((c) => Math.max(0, c - 1))}
              >
                Précédent
              </Button>
              {judged[q.id] === undefined ? (
                <Button
                  color="primary"
                  isDisabled={selected === undefined}
                  onPress={validateCurrent}
                >
                  Valider
                </Button>
              ) : current < total - 1 ? (
                <Button
                  color="primary"
                  onPress={() => setCurrent((c) => Math.min(total - 1, c + 1))}
                >
                  Suivant
                </Button>
              ) : (
                <Button color="primary" onPress={validateAll}>
                  Terminer
                </Button>
              )}
            </div>
          </>
        ) : null}

        {scored
          ? (() => {
              const pct = Math.round((scored.aiScore ?? 0) * 100);
              const mood =
                pct >= 80 ? "😀" : pct >= 60 ? "🙂" : pct >= 40 ? "😕" : "😞";
              const caption =
                pct >= 80
                  ? "Excellent"
                  : pct >= 60
                    ? "Bien"
                    : pct >= 40
                      ? "À travailler"
                      : "Revoir le cours";
              return (
                <div className="grid gap-3 items-center text-center">
                  <div className="text-4xl" aria-hidden>
                    {mood}
                  </div>
                  <div className="text-lg font-semibold">
                    Score IA : {pct}% — {caption}
                  </div>
                  <p className="text-xs text-default-500">
                    Vous pouvez confirmer ou corriger l’évaluation de l’IA
                    ci-dessous.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      color="success"
                      variant={decision === "success" ? "solid" : "bordered"}
                      onPress={() => finalize("success")}
                    >
                      Je confirme : réussi
                    </Button>
                    <Button
                      color="danger"
                      variant={decision === "fail" ? "solid" : "bordered"}
                      onPress={() => finalize("fail")}
                    >
                      Je corrige : échec
                    </Button>
                  </div>
                </div>
              );
            })()
          : null}
      </CardBody>
    </Card>
  );
}
