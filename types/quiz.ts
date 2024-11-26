export type QuizType = 'multiple-choice' | 'open-ended' | 'flash-cards' | 'oral-exam'

export interface MultipleChoiceQuestion {
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
}

export interface OpenEndedQuestion {
  question: string
  sampleAnswer: string
  gradingRubric: {
    keyPoints: string[]
    scoringCriteria: string
  }
}

export interface FlashCard {
  front: string
  back: string
  hints?: string[]
}

export interface OralExamQuestion {
  topic: string
  questions: {
    question: string
    expectedPoints: string[]
    followUpQuestions?: string[]
  }[]
}

export interface QueryResponse {
  query: string
  stopQuery: boolean
  contextSummary?: string
}

export interface GeneratedQuiz {
  type: QuizType
  questions: MultipleChoiceQuestion[] | OpenEndedQuestion[] | FlashCard[] | OralExamQuestion[]
}