/**
 * Helpers para upload de fotos ao Firebase Storage.
 */

async function uploadFoto(path, file) {
  const blob = await resizeImageFile(file, 1600);
  const ref = storage.ref().child(path);
  await ref.put(blob, { contentType: "image/jpeg" });
  return ref.getDownloadURL();
}

async function deleteFotoByUrl(url) {
  try {
    const ref = storage.refFromURL(url);
    await ref.delete();
  } catch (e) {
    console.warn("Falha ao apagar foto do Storage:", e);
  }
}

function novoNomeFicheiro() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
}
