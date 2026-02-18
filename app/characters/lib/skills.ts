export const PREDEFINED_SKILLS = [
  'Athleticism',
  'Awareness',
  'Connections',
  'Deception',
  'Driving',
  'Engineering',
  'Explosives',
  'Hacking',
  'Influence',
  'Intimidation',
  'Investigation',
  'Marksmanship',
  'Martial Arts',
  'Medicine',
  'Melee Combat',
  'Piloting',
  'Seduction',
  'Stealth',
  'Street Smarts',
  'Tracking',
] as const;

export type PredefinedSkill = (typeof PREDEFINED_SKILLS)[number];

export function canonicalizeIfPredefined(skillName: string): string {
  const trimmed = skillName.trim().replace(/\s+/g, ' ');
  const match = PREDEFINED_SKILLS.find((s) => s.toLowerCase() === trimmed.toLowerCase());
  return match ?? trimmed;
}

export function isPredefinedSkill(skillName: string): boolean {
  const normalized = skillName.trim().replace(/\s+/g, ' ').toLowerCase();
  return PREDEFINED_SKILLS.some((s) => s.toLowerCase() === normalized);
}
