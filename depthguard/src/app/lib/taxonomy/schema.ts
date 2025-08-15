export type Phase =
  | 'identify_inputs' | 'attack_ecosystem' | 'attack_model'
  | 'attack_prompt_engineering' | 'attack_data_layer' | 'attack_application';

export type AttackDefinition = {
  id: string; title: string; version: string; phase: Phase; intent: string;
  techniques: string[]; evasions?: string[]; utilities?: string[];
  description: string;
  payload_template: string;
  expected_success: string[];
  expected_severity: 'low'|'medium'|'high'|'critical';
  requires?: { streaming?: boolean; tools_enabled?: boolean; rag_enabled?: boolean };
};
export type AttackPack = {
  pack_id: string; display_name: string; version: string; updated_at: string;
  default_enabled: boolean; attacks: AttackDefinition[];
};
