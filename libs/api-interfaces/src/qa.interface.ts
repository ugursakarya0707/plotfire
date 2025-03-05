import { 
  AnswerDto, 
  CreateAnswerDto, 
  CreateQuestionDto, 
  QuestionDto 
} from '@postply/models';

export interface QAServiceInterface {
  // Questions
  createQuestion(studentId: string, createQuestionDto: CreateQuestionDto): Promise<QuestionDto>;
  getQuestionById(questionId: string): Promise<QuestionDto>;
  getQuestionsByClassId(classId: string): Promise<QuestionDto[]>;
  getQuestionsByStudentId(studentId: string): Promise<QuestionDto[]>;
  
  // Answers
  createAnswer(teacherId: string, createAnswerDto: CreateAnswerDto): Promise<AnswerDto>;
  getAnswersByQuestionId(questionId: string): Promise<AnswerDto[]>;
}

// API Routes
export const QA_SERVICE_ROUTES = {
  CREATE_QUESTION: '/questions',
  GET_QUESTION_BY_ID: '/questions/:questionId',
  GET_QUESTIONS_BY_CLASS: '/questions/class/:classId',
  GET_QUESTIONS_BY_STUDENT: '/questions/student/:studentId',
  
  CREATE_ANSWER: '/answers',
  GET_ANSWERS_BY_QUESTION: '/answers/question/:questionId',
};
