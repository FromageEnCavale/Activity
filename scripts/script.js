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
        this.deleteTarget = null;
        this.longPressTimer = null;
        this.longPressThreshold = 800; // 800ms pour déclencher l'appui long

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

        // Modals
        this.setupModalListeners();
    }

    setupModalListeners() {
        // Modal élève
        document.getElementById('cancelStudentButton').addEventListener('click', () => {
            this.hideModal('addStudentModal');
        });

        document.getElementById('validateStudentButton').addEventListener('click', () => {
            this.addStudent();
        });

        document.getElementById('studentNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addStudent();
            }
        });

        // Modal activité
        document.getElementById('cancelActivityButton').addEventListener('click', () => {
            this.hideModal('addActivityModal');
        });

        document.getElementById('validateActivityButton').addEventListener('click', () => {
            this.addActivity();
        });

        document.getElementById('activityNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addActivity();
            }
        });

        // Modal suppression
        document.getElementById('cancelDeleteButton').addEventListener('click', () => {
            this.hideModal('deleteModal');
        });

        document.getElementById('confirmDeleteButton').addEventListener('click', () => {
            this.confirmDelete();
        });

        // Fermer modal en cliquant à l'extérieur
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
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
                card.innerHTML = `
                            <div class="student-name">${student.name}</div>
                        `;

                // Gestion du clic
                card.addEventListener('click', () => {
                    this.showStudentView(originalIndex);
                });

                // Gestion de l'appui long
                this.setupLongPress(card, () => {
                    this.showDeleteModal('student', originalIndex, student.name);
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
            this.showAddStudentModal();
        });

        grid.appendChild(addButton);
    }

    setupLongPress(element, callback) {
        let startTime = 0;
        let startX = 0;
        let startY = 0;
        const threshold = 10; // Seuil de mouvement en pixels

        const startPress = (e) => {
            startTime = Date.now();
            const touch = e.touches ? e.touches[0] : e;
            startX = touch.clientX;
            startY = touch.clientY;

            element.classList.add('deleting');

            this.longPressTimer = setTimeout(() => {
                callback();
                element.classList.remove('deleting');
            }, this.longPressThreshold);
        };

        const endPress = (e) => {
            const duration = Date.now() - startTime;
            const touch = e.changedTouches ? e.changedTouches[0] : e;
            const deltaX = Math.abs(touch.clientX - startX);
            const deltaY = Math.abs(touch.clientY - startY);

            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }

            element.classList.remove('deleting');

            // Si c'est un clic court et sans mouvement, traiter comme un clic normal
            if (duration < this.longPressThreshold && deltaX < threshold && deltaY < threshold) {
                // Le clic normal sera géré par l'événement click
            }
        };

        const cancelPress = () => {
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
            element.classList.remove('deleting');
        };

        element.addEventListener('mousedown', startPress);
        element.addEventListener('touchstart', startPress);
        element.addEventListener('mouseup', endPress);
        element.addEventListener('touchend', endPress);
        element.addEventListener('mouseleave', cancelPress);
        element.addEventListener('touchcancel', cancelPress);
    }

    showAddStudentModal() {
        document.getElementById('studentNameInput').value = '';
        this.showModal('addStudentModal');
        setTimeout(() => {
            document.getElementById('studentNameInput').focus();
        }, 100);
    }

    showAddActivityModal() {
        document.getElementById('activityNameInput').value = '';
        this.showModal('addActivityModal');
        setTimeout(() => {
            document.getElementById('activityNameInput').focus();
        }, 100);
    }

    showDeleteModal(type, index, name) {
        this.deleteTarget = {type, index, name};

        const title = type === 'student' ? 'Supprimer l\'élève' : 'Supprimer l\'activité';
        const text = type === 'student'
            ? `Êtes-vous sûr de vouloir supprimer l'élève "${name}" ?`
            : `Êtes-vous sûr de vouloir supprimer l'activité "${name}" pour tous les élèves ?`;

        document.getElementById('deleteModalTitle').textContent = title;
        document.getElementById('deleteModalText').textContent = text;

        this.showModal('deleteModal');
    }

    confirmDelete() {
        if (!this.deleteTarget) return;

        const {type, index} = this.deleteTarget;

        if (type === 'student') {
            this.students.splice(index, 1);
            this.renderStudents();
        } else if (type === 'activity') {
            this.activities.splice(index, 1);
            // Mettre à jour les états des activités pour tous les élèves
            this.students.forEach(student => {
                if (student.activityStates && student.activityStates[index] !== undefined) {
                    delete student.activityStates[index];
                    // Réajuster les indices
                    const newStates = {};
                    Object.keys(student.activityStates).forEach(key => {
                        const keyIndex = parseInt(key);
                        if (keyIndex > index) {
                            newStates[keyIndex - 1] = student.activityStates[key];
                        } else if (keyIndex < index) {
                            newStates[keyIndex] = student.activityStates[key];
                        }
                    });
                    student.activityStates = newStates;
                }
            });
            if (this.currentStudent !== null) {
                this.renderActivities();
            }
        }

        this.saveData();
        this.hideModal('deleteModal');
        this.deleteTarget = null;
    }

    addStudent() {
        const name = document.getElementById('studentNameInput').value.trim();
        if (name) {
            this.students.push({
                name: name,
                activityStates: {}
            });
            this.saveData();
            this.renderStudents();
            this.hideModal('addStudentModal');
        }
    }

    addActivity() {
        const name = document.getElementById('activityNameInput').value.trim();
        if (name) {
            this.activities.push({name: name});
            this.saveData();
            if (this.currentStudent !== null) {
                this.renderActivities();
            }
            this.hideModal('addActivityModal');
        }
    }

    showStudentView(studentIndex) {
        this.currentStudent = studentIndex;
        const student = this.students[studentIndex];

        document.getElementById('studentName').textContent = student.name;
        this.renderActivities();

        document.getElementById('mainView').classList.add('hidden');
        document.getElementById('studentView').classList.add('active');
    }

    showMainView() {
        this.currentStudent = null;
        document.getElementById('mainView').classList.remove('hidden');
        document.getElementById('studentView').classList.remove('active');
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
                const states = ['', 'green', 'orange', 'red', 'purple'];
                if (state > 0) {
                    card.classList.add(states[state]);
                }

                card.innerHTML = `
                            ${activity.name}
                        `;

                // Gestion du clic pour changer d'état
                card.addEventListener('click', () => {
                    this.toggleActivityState(originalIndex);
                });

                // Gestion de l'appui long
                this.setupLongPress(card, () => {
                    this.showDeleteModal('activity', originalIndex, activity.name);
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
        const newState = (currentState + 1) % 5; // 0, 1, 2, 3, 4, puis retour à 0

        if (newState === 0) {
            delete student.activityStates[activityIndex];
        } else {
            student.activityStates[activityIndex] = newState;
        }

        this.saveData();
        this.renderActivities();
    }

    showModal(modalId) {
        document.getElementById(modalId).classList.add('show');
    }

    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('show');
    }
}

// Initialiser l'application
document.addEventListener('DOMContentLoaded', () => {
    new StudentActivityApp();
});