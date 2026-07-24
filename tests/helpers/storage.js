export async function seedLocalStorage(page, values) {
  await page.addInitScript(seed => {
    for (const [key, value] of Object.entries(seed)) localStorage.setItem(key, JSON.stringify(value));
  }, values);
}

export async function clearTestDatabases(page) {
  await page.evaluate(async () => {
    const databases = await indexedDB.databases?.() || [];
    await Promise.all(databases.map(({ name }) => new Promise(resolve => {
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = request.onerror = request.onblocked = () => resolve();
    })));
  });
}
