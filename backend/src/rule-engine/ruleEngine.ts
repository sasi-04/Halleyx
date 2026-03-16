import { Rule } from '@prisma/client';
import { evaluateCondition, ExecutionData } from './expressionEvaluator';

export interface RuleEvaluationResult {
  ruleId: string;
  condition: string;
  result: boolean;
  priority: number;
  is_default: boolean;
  next_step_id: string | null;
}

export interface StepRuleResolution {
  evaluations: RuleEvaluationResult[];
  selectedNextStepId: string | null;
}

export function evaluateRulesForStep(
  rules: Rule[],
  data: ExecutionData,
): StepRuleResolution {
  const nonDefaultRules = rules.filter((r) => !r.is_default && r.condition.toUpperCase() !== 'DEFAULT');
  const defaultRules = rules.filter((r) => r.is_default || r.condition.toUpperCase() === 'DEFAULT');

  nonDefaultRules.sort((a, b) => a.priority - b.priority);

  const evaluations: RuleEvaluationResult[] = [];
  let selectedNextStepId: string | null = null;

  for (const rule of nonDefaultRules) {
    let result = false;
    try {
      result = evaluateCondition(rule.condition, data);
    } catch {
      result = false;
    }
    evaluations.push({
      ruleId: rule.id,
      condition: rule.condition,
      result,
      priority: rule.priority,
      is_default: rule.is_default,
      next_step_id: rule.next_step_id,
    });
    if (result && selectedNextStepId === null) {
      selectedNextStepId = rule.next_step_id ?? null;
      break;
    }
  }

  if (selectedNextStepId === null) {
    if (defaultRules.length > 0) {
      const defaultRule = defaultRules.sort((a, b) => a.priority - b.priority)[0];
      evaluations.push({
        ruleId: defaultRule.id,
        condition: defaultRule.condition,
        result: true,
        priority: defaultRule.priority,
        is_default: defaultRule.is_default,
        next_step_id: defaultRule.next_step_id,
      });
      selectedNextStepId = defaultRule.next_step_id ?? null;
    }
  }

  return {
    evaluations,
    selectedNextStepId,
  };
}

