// Turns a missing-skill name into real, guaranteed-working links —
// generated deterministically, never from AI text, so there's no risk
// of a hallucinated or dead URL being shown to the user.
export function getSkillResources(skill) {
  const q = encodeURIComponent(`${skill} tutorial`)
  const qFree = encodeURIComponent(`${skill} course`)
  return [
    {
      label: `${skill} tutorials on YouTube`,
      url: `https://www.youtube.com/results?search_query=${q}`,
    },
    {
      label: `Free ${skill} courses on freeCodeCamp`,
      url: `https://www.freecodecamp.org/news/search/?query=${qFree}`,
    },
    {
      label: `${skill} docs & guides on MDN / official docs search`,
      url: `https://www.google.com/search?q=${encodeURIComponent(skill + ' official documentation')}`,
    },
  ]
}
