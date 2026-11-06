
document.addEventListener("DOMContentLoaded", () => {

    const lienCompte = document.getElementById("lien-compte");

    if (!lienCompte) return;

    function afficherUtilisateur(user) {

        if (user) {
            // Récupérer l'identifiant de l'utilisateur
            const identifiant =
                user.user_metadata?.username ||
                user.email?.split("@")[0] ||
                "Mon compte";

            // Afficher l'identifiant
            lienCompte.textContent = identifiant;

            // Rediriger vers les paramètres
            lienCompte.href = "parametre.html";

        } else {
            // Aucun utilisateur connecté
            lienCompte.textContent = "Se connecter";
            lienCompte.href = "connexion.html";
        }
    }

    // Détecter la connexion et la déconnexion
    supabaseClient.auth.onAuthStateChange((event, session) => {
        afficherUtilisateur(session?.user ?? null);
    });

});
