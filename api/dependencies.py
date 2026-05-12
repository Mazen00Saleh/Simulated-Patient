"""api.dependencies

FastAPI dependency-injection providing app-lifetime singletons for the
patient simulator, patient evaluator, and trainee evaluation pipeline.
"""

from __future__ import annotations

from functools import lru_cache

from src.evaluation.patient.deepeval_patient import DeepEvalPatientEvaluator
from src.evaluation.trainee.pipeline import TraineeEvalPipeline
from src.patient_sim.openai_patient_sim import OpenAIPatientSimulator
from src.trainee_judge.trainee_judge_openai import judge_trainee_with_groq
from src.trainee_judge.trainee_judge_schema import load_rubric as load_examiner_rubric
from src.trainee_judge.trainee_score import score_from_judge_output
from src.utils.logger import get_logger

logger = get_logger(__name__)


@lru_cache(maxsize=1)
def get_patient_simulator() -> OpenAIPatientSimulator:
    try:
        simulator = OpenAIPatientSimulator()
        logger.debug("OpenAIPatientSimulator initialized successfully")
        return simulator
    except Exception as e:
        logger.error(f"Error initializing OpenAIPatientSimulator: {type(e).__name__}: {e}")
        raise


@lru_cache(maxsize=1)
def get_patient_evaluator() -> DeepEvalPatientEvaluator:
    try:
        evaluator = DeepEvalPatientEvaluator()
        logger.debug("DeepEvalPatientEvaluator initialized successfully")
        return evaluator
    except Exception as e:
        logger.error(f"Error initializing DeepEvalPatientEvaluator: {type(e).__name__}: {e}")
        raise


@lru_cache(maxsize=1)
def get_trainee_pipeline() -> TraineeEvalPipeline:
    try:
        pipeline = TraineeEvalPipeline(
            rubric_loader=load_examiner_rubric,
            judge_fn=judge_trainee_with_groq,
            scorer_fn=score_from_judge_output,
        )
        logger.debug("TraineeEvalPipeline initialized successfully")
        return pipeline
    except Exception as e:
        logger.error(f"Error initializing TraineeEvalPipeline: {type(e).__name__}: {e}")
        raise
