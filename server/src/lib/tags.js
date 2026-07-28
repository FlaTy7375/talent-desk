/** Upsert tags by name and return records. */
export async function ensureTags(db, names) {
  const unique = [...new Set(names.map((name) => String(name).trim()).filter(Boolean))];
  const tags = [];
  for (const name of unique) {
    tags.push(
      await db.tag.upsert({
        where: { name },
        create: { name },
        update: {},
      })
    );
  }
  return tags;
}
