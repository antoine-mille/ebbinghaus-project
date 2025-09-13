export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[]; // MCQ options
  correct: number; // index in options
};

export type Quiz = {
  questions: QuizQuestion[];
};

export interface QuizProvider {
  generate(course: {
    id: string;
    name: string;
    description?: string;
  }): Promise<Quiz>;
  score(
    answers: { questionId: string; optionIndex: number }[],
    quiz: Quiz
  ): Promise<number>; // 0..1
}

export class MockQuizProvider implements QuizProvider {
  async generate(course: {
    id: string;
    name: string;
    description?: string;
  }): Promise<Quiz> {
    const base = course.name;
    const mk = (
      prompt: string,
      correct: string,
      distractors: string[]
    ): QuizQuestion => {
      const options = [correct, ...distractors].slice(0, 4);
      // simple shuffle
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      const correctIndex = options.indexOf(correct);
      return {
        id: crypto.randomUUID(),
        prompt,
        options,
        correct: correctIndex,
      };
    };

    const questions: QuizQuestion[] = [
      mk(
        `Quelle option décrit le mieux: ${base} ?`,
        `${base}: définition clé`,
        [
          `${base}: exemple non pertinent`,
          `${base}: idée voisine`,
          `${base}: terme confus`,
        ]
      ),
      mk(
        `Lequel est un bon exemple lié à: ${base} ?`,
        `Exemple correct lié à ${base}`,
        [`Contre-exemple de ${base}`, `Hors sujet`, `Détail trompeur`]
      ),
      mk(`Quel est un point clé de: ${base} ?`, `Point clé de ${base}`, [
        `Détail mineur de ${base}`,
        `Information superflue`,
        `Hypothèse incorrecte`,
      ]),
    ];

    return { questions };
  }

  async score(
    answers: { questionId: string; optionIndex: number }[],
    quiz: Quiz
  ): Promise<number> {
    const byId = new Map(answers.map((a) => [a.questionId, a.optionIndex]));
    const correct = quiz.questions.reduce(
      (acc, q) => acc + (byId.get(q.id) === q.correct ? 1 : 0),
      0
    );
    return correct / quiz.questions.length;
  }
}

export class ApiQuizProvider implements QuizProvider {
  async generate(course: {
    id: string;
    name: string;
    description?: string;
  }): Promise<Quiz> {
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ course }),
      });
      if (!res.ok) throw new Error("API error");
      const data = (await res.json()) as Quiz;
      // Light runtime guard
      if (!data?.questions || !Array.isArray(data.questions))
        throw new Error("Invalid quiz");
      return data;
    } catch {
      // Fallback to mock if server not configured
      const mock = new MockQuizProvider();
      return mock.generate(course);
    }
  }
  async score(
    answers: { questionId: string; optionIndex: number }[],
    quiz: Quiz
  ): Promise<number> {
    const byId = new Map(answers.map((a) => [a.questionId, a.optionIndex]));
    const correct = quiz.questions.reduce(
      (acc, q) => acc + (byId.get(q.id) === q.correct ? 1 : 0),
      0
    );
    return correct / quiz.questions.length;
  }
}

export const quizProvider = new ApiQuizProvider();
