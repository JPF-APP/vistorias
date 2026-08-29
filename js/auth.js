/**
 * Autenticação e gestão de papéis (admin / vistoriador / pendente).
 */

const AppAuth = {
  user: null,       // firebase.auth().currentUser
  profile: null,    // { role, nome } do documento /users/{uid}
  vistoriadores: [], // lista de {id, nome} com role vistoriador ou admin, para atribuição

  isAdmin() { return this.profile && this.profile.role === "admin"; },
  isAprovado() { return this.profile && (this.profile.role === "admin" || this.profile.role === "vistoriador"); },
};

async function carregarPerfil(uid) {
  const snap = await db.collection("users").doc(uid).get();
  return snap.exists ? snap.data() : null;
}

async function carregarListaVistoriadores() {
  const snap = await db.collection("users")
    .where("role", "in", ["admin", "vistoriador"])
    .get();
  AppAuth.vistoriadores = snap.docs.map(d => ({ id: d.id, nome: d.data().nome || d.data().email || d.id }));
}

async function fazerLogin(email, password) {
  await auth.signInWithEmailAndPassword(email, password);
}

async function fazerSignup(nome, email, password) {
  // Toda a conta nova fica "pendente" (imposto também pelas regras do Firestore).
  // O primeiro admin tem de ser promovido manualmente na consola do Firebase
  // (ver instruções de deployment) — depois disso, promoções seguintes já podem
  // ser feitas dentro da própria app, no ecrã "Utilizadores".
  const cred = await auth.createUserWithEmailAndPassword(email, password);
  await db.collection("users").doc(cred.user.uid).set({
    nome, email, role: "pendente",
    criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

async function fazerLogout() {
  await auth.signOut();
}

async function aprovarUtilizador(uid, role) {
  await db.collection("users").doc(uid).update({ role });
}

function listenAuthState(onReady) {
  auth.onAuthStateChanged(async (user) => {
    setLoading(true);
    try {
      AppAuth.user = user;
      if (user) {
        AppAuth.profile = await carregarPerfil(user.uid);
        if (AppAuth.isAprovado()) {
          await carregarListaVistoriadores();
        }
      } else {
        AppAuth.profile = null;
        AppAuth.vistoriadores = [];
      }
      onReady();
    } finally {
      setLoading(false);
    }
  });
}
