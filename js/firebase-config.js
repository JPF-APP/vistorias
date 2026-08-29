/**
 * Configuração do Firebase.
 *
 * Substitui os valores abaixo pelos da tua consola Firebase:
 * Firebase Console > Definições do Projeto > Geral > As tuas apps > SDK setup and configuration.
 *
 * Este ficheiro pode ficar público no repositório GitHub Pages — estas chaves
 * identificam o projeto mas não dão acesso por si só; a segurança real vem
 * das Regras do Firestore/Storage (firestore.rules / storage.rules) e da
 * necessidade de autenticação.
 */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB93b2iqCq51egM92nv8bM-q8fCePHUhMg",
  authDomain: "vistorias-unidades-industriais.firebaseapp.com",
  projectId: "vistorias-unidades-industriais",
  storageBucket: "vistorias-unidades-industriais.firebasestorage.app",
  messagingSenderId: "57329993800",
  appId: "G-JW7NNP8FV9",
};

firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
