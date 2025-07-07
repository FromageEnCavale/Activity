if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('SW inscrit:', reg.scope))
            .catch(err => console.error('Échec inscription SW:', err));
    });
}

class StudentActivityApp {
    constructor() {
        this.students = [];
        this.activities = [];
        this.currentStudent = null;
        this.deleteMode = false;
        this.selectedIndexes = []; // Array pour sélections multiples
        this.deleteType = null; // 'student' ou 'activity'

        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.renderStudents();
    }

    loadData() {
        const savedStudents = localStorage.getItem('students');
        const savedActivities = localStorage.getItem('activities');

        if (savedStudents) {
            this.students = JSON.parse(savedStudents);
        }

        if (savedActivities) {
            this.activities = JSON.parse(savedActivities);
        }
    }

    saveData() {
        localStorage.setItem('students', JSON.stringify(this.students));
        localStorage.setItem('activities', JSON.stringify(this.activities));
    }

    setupEventListeners() {
        // Bouton d'ajout d'activité
        document.getElementById('addActivityButton').addEventListener('click', () => {
            this.showAddActivityModal();
        });

        // Bouton retour
        document.getElementById('backButton').addEventListener('click', () => {
            this.showMainView();
        });

        // Bouton Supprimer élèves
        document.getElementById('deleteStudentButton').addEventListener('click', () => {
            this.toggleDeleteMode('student');
        });

        // Bouton Supprimer activités
        document.getElementById('deleteActivityButton').addEventListener('click', () => {
            this.toggleDeleteMode('activity');
        });
    }

    toggleDeleteMode(type) {
        this.deleteType = type;
        const button = type === 'student' ?
            document.getElementById('deleteStudentButton') :
            document.getElementById('deleteActivityButton');

        if (!this.deleteMode) {
            // Activer le mode Supprimer
            this.deleteMode = true;
            this.selectedIndexes = [];
            button.textContent = 'Valider';
            button.classList.add('validate');

            if (type === 'student') {
                this.setStudentDeleteMode(true);
            } else {
                this.setActivityDeleteMode(true);
            }
        } else {
            // Valider la Supprimer ou annuler
            if (this.selectedIndexes.length > 0) {
                this.confirmDelete();
            }

            this.deleteMode = false;
            this.selectedIndexes = [];
            button.textContent = 'Editer';
            button.classList.remove('validate');

            if (type === 'student') {
                this.setStudentDeleteMode(false);
            } else {
                this.setActivityDeleteMode(false);
            }
        }
    }

    setStudentDeleteMode(enabled) {
        const cards = document.querySelectorAll('#studentsGrid .card:not(.add-button)');
        cards.forEach(card => {
            if (enabled) {
                card.classList.add('delete-mode');
            } else {
                card.classList.remove('delete-mode', 'selected');
            }
        });
    }

    setActivityDeleteMode(enabled) {
        const cards = document.querySelectorAll('.activity-card');
        cards.forEach(card => {
            if (enabled) {
                card.classList.add('delete-mode');
            } else {
                card.classList.remove('delete-mode', 'selected');
            }
        });
    }

    renderStudents() {
        const grid = document.getElementById('studentsGrid');
        grid.innerHTML = '';

        // Afficher les élèves seulement s'il y en a
        if (this.students && this.students.length > 0) {
            // Trier les élèves par ordre alphabétique avec leurs index originaux
            const sortedStudents = this.students
                .map((student, index) => ({student, originalIndex: index}))
                .sort((a, b) => a.student.name.localeCompare(b.student.name));

            sortedStudents.forEach(({student, originalIndex}) => {
                const card = document.createElement('div');
                card.className = 'card';

                // Ajouter la classe selon le type d'élève
                if (student.type === 'PS') {
                    card.classList.add('ps-student');
                } else if (student.type === 'MS') {
                    card.classList.add('ms-student');
                }

                card.innerHTML = `
                            <div class="student-name">${student.name}</div>
                        `;

                // Gestion du clic
                card.addEventListener('click', () => {
                    if (this.deleteMode && this.deleteType === 'student') {
                        this.selectForDeletion(originalIndex, card);
                    } else if (!this.deleteMode) {
                        this.showStudentView(originalIndex);
                    }
                });

                grid.appendChild(card);
            });
        }

        // Bouton d'ajout d'élève (toujours affiché)
        const addButton = document.createElement('div');
        addButton.className = 'card add-button';
        addButton.innerHTML = `
                    <div>+</div>
                    <div>Ajouter un élève</div>
                `;
        addButton.addEventListener('click', () => {
            if (!this.deleteMode) {
                this.showAddStudentModal();
            }
        });

        grid.appendChild(addButton);
    }

    selectForDeletion(index, element) {
        const indexPosition = this.selectedIndexes.indexOf(index);

        if (indexPosition === -1) {
            // Ajouter à la sélection
            this.selectedIndexes.push(index);
            element.classList.add('selected');
        } else {
            // Retirer de la sélection
            this.selectedIndexes.splice(indexPosition, 1);
            element.classList.remove('selected');
        }
    }

    confirmDelete() {
        if (this.selectedIndexes.length === 0) return;

        if (this.deleteType === 'student') {
            // Trier les index en ordre décroissant pour éviter les problèmes d'index
            const sortedIndexes = this.selectedIndexes.sort((a, b) => b - a);

            sortedIndexes.forEach(index => {
                this.students.splice(index, 1);
            });

            this.renderStudents();
        } else if (this.deleteType === 'activity') {
            // Trier les index en ordre décroissant pour éviter les problèmes d'index
            const sortedIndexes = this.selectedIndexes.sort((a, b) => b - a);

            sortedIndexes.forEach(index => {
                this.activities.splice(index, 1);
            });

            // Mettre à jour les états des activités pour tous les élèves
            this.students.forEach(student => {
                if (student.activityStates) {
                    const newStates = {};
                    Object.keys(student.activityStates).forEach(key => {
                        const keyIndex = parseInt(key);
                        // Calculer le nouveau index après Supprimer
                        let newIndex = keyIndex;
                        sortedIndexes.forEach(deletedIndex => {
                            if (keyIndex > deletedIndex) {
                                newIndex--;
                            }
                        });

                        // Garder l'état seulement si l'activité n'a pas été supprimée
                        if (!sortedIndexes.includes(keyIndex)) {
                            newStates[newIndex] = student.activityStates[key];
                        }
                    });
                    student.activityStates = newStates;
                }
            });

            this.renderActivities();
        }

        this.saveData();
    }

    showAddStudentModal() {
        const name = prompt('Nom de l\'élève:');
        if (name && name.trim()) {
            const isMS = confirm('Est-ce un élève de MS ?');
            const studentType = isMS ? 'MS' : 'PS';

            this.students.push({
                name: name.trim(),
                type: studentType,
                activityStates: {}
            });
            this.saveData();
            this.renderStudents();
        }
    }

    showAddActivityModal() {
        const name = prompt('Nom de l\'activité:');
        if (name && name.trim()) {
            this.activities.push({name: name.trim()});
            this.saveData();
            if (this.currentStudent !== null) {
                this.renderActivities();
            }
        }
    }

    showStudentView(studentIndex) {
        this.currentStudent = studentIndex;
        const student = this.students[studentIndex];

        document.getElementById('studentName').textContent = student.name;
        this.renderActivities();

        document.getElementById('mainView').classList.add('hidden');
        document.getElementById('studentView').classList.add('active');

        // Réinitialiser le mode Supprimer
        this.deleteMode = false;
        this.selectedIndexes = [];
        const deleteButton = document.getElementById('deleteActivityButton');
        deleteButton.textContent = 'Editer';
        deleteButton.classList.remove('validate');
    }

    showMainView() {
        this.currentStudent = null;
        document.getElementById('mainView').classList.remove('hidden');
        document.getElementById('studentView').classList.remove('active');

        // Réinitialiser le mode Supprimer
        this.deleteMode = false;
        this.selectedIndexes = [];
        const deleteButton = document.getElementById('deleteStudentButton');
        deleteButton.textContent = 'Supprimer';
        deleteButton.classList.remove('validate');
    }

    renderActivities() {
        const container = document.getElementById('activitiesContainer');
        container.innerHTML = '';

        // Afficher les activités seulement s'il y en a
        if (this.activities && this.activities.length > 0) {
            // Afficher les activités dans l'ordre inverse (plus récente en premier)
            const reversedActivities = [...this.activities].reverse();

            reversedActivities.forEach((activity, reversedIndex) => {
                // Calculer l'index original pour la logique de l'état
                const originalIndex = this.activities.length - 1 - reversedIndex;

                const card = document.createElement('div');
                card.className = 'activity-card';

                const student = this.students[this.currentStudent];
                const state = student.activityStates[originalIndex] || 0;

                // Appliquer la couleur selon l'état
                const states = ['', 'valide', 'acquis', 'non-acquis'];
                if (state > 0) {
                    card.classList.add(states[state]);
                }

                card.innerHTML = `
                            ${activity.name}
                        `;

                // Gestion du clic
                card.addEventListener('click', () => {
                    if (this.deleteMode && this.deleteType === 'activity') {
                        this.selectForDeletion(originalIndex, card);
                    } else if (!this.deleteMode) {
                        this.toggleActivityState(originalIndex);
                    }
                });

                container.appendChild(card);
            });
        }
    }

    toggleActivityState(activityIndex) {
        const student = this.students[this.currentStudent];
        if (!student.activityStates) {
            student.activityStates = {};
        }

        const currentState = student.activityStates[activityIndex] || 0;
        const newState = (currentState + 1) % 4; // 0, 1, 2, 3, puis retour à 0

        if (newState === 0) {
            delete student.activityStates[activityIndex];
        } else {
            student.activityStates[activityIndex] = newState;
        }

        this.saveData();
        this.renderActivities();
    }
}

// Initialiser l'application
document.addEventListener('DOMContentLoaded', () => {
    new StudentActivityApp();
});