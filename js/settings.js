
const h2Username = document.getElementById("h2-username");
const buttonSignout = document.getElementById("button-signout");

// Vérifier l'utilisateur connecté
async function init() {
    try {
        const { user, error } = await Auth.getUser();

        if (error || !user) {
            window.location.replace("./connexion.html");
            return;
        }

        h2Username.textContent = user.email;

    } catch (error) {
        console.error("Erreur de session :", error);
    }
}

init();

// Déconnexion
buttonSignout.addEventListener("click", async () => {
    buttonSignout.disabled = true;

    try {
        const { error } = await Auth.signOut();

        if (error) {
            throw error;
        }

        // Effacer les données locales de la session
        Local.clearSession();

        // Retourner à la connexion
        window.location.replace("./connexion.html");

    } catch (error) {
        console.error("Erreur de déconnexion :", error);
        alert("Impossible de se déconnecter : " + error.message);
        buttonSignout.disabled = false;
    }
});
