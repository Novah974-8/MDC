"use strict";

const formulaire = document.getElementById("form-signin");
const inputEmail = document.getElementById("email");
const inputPassword = document.getElementById("password");
const boutonConnexion = formulaire.querySelector('button[type="submit"]');
const boutonInscription = document.getElementById("button-signup");
const messageAuth = document.getElementById("auth-message");

function afficherMessage(texte, estErreur = false) {
  messageAuth.textContent = texte;
  messageAuth.style.color = estErreur ? "#ff9a9a" : "#dce6ff";
}

function lireIdentifiants() {
  const email = inputEmail.value.trim();
  const password = inputPassword.value;
  if (!email || !password) {
    afficherMessage("Veuillez remplir l'adresse courriel et le mot de passe.", true);
    return null;
  }
  return { email, password };
}

formulaire.addEventListener("submit", async (event) => {
  event.preventDefault();
  const identifiants = lireIdentifiants();
  if (!identifiants) return;

  boutonConnexion.disabled = true;
  afficherMessage("Connexion en cours...");
  try {
    const { data, error } = await Auth.signIn(identifiants.email, identifiants.password);
    if (error) {
      afficherMessage("Connexion refusée : " + error.message, true);
      console.error("Erreur Supabase à la connexion :", error);
      return;
    }
    if (data?.session) {
      window.location.replace("./conversation.html");
    } else {
      afficherMessage("Aucune session ouverte. Vérifie si ton courriel doit être confirmé.", true);
    }
  } catch (error) {
    afficherMessage("Impossible de joindre l'authentification : " + error.message, true);
    console.error(error);
  } finally {
    boutonConnexion.disabled = false;
  }
});

// Le garde protège la connexion si le bouton d'inscription est retiré plus tard.
if (boutonInscription) {
  boutonInscription.addEventListener("click", async () => {
    const identifiants = lireIdentifiants();
    if (!identifiants) return;

    boutonInscription.disabled = true;
    afficherMessage("Inscription en cours...");
    try {
      const { data, error } = await Auth.signUp(identifiants.email, identifiants.password);
      if (error) {
        afficherMessage("Inscription refusée : " + error.message, true);
        console.error("Erreur Supabase à l'inscription :", error);
        return;
      }
      if (data?.session) {
        window.location.replace("./conversation.html");
      } else {
        afficherMessage("Inscription demandée. Vérifie tes courriels pour confirmer ton compte, si nécessaire.");
      }
    } catch (error) {
      afficherMessage("Impossible de joindre l'authentification : " + error.message, true);
      console.error(error);
    } finally {
      boutonInscription.disabled = false;
    }
  });
}

// Si l'utilisateur possède déjà une session, il peut entrer dans la messagerie.
Auth.onSessionChange((event, session) => {
  if ((event === "INITIAL_SESSION" || event === "SIGNED_IN") && session?.user) {
    window.location.replace("./conversation.html");
  }
});
