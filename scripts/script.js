if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('SW inscrit:', reg.scope))
            .catch(err => console.error('Échec inscription SW:', err));
    });
}

if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('portrait')
        .catch(err => console.warn('Impossible de lock l’orientation:', err));
}

class StudentActivityApp {
    constructor() {
        this.students = [];
        this.activities = [];
        this.currentStudent = null;
        this.deleteMode = false;
        this.selectedIndexes = [];
        this.deleteType = null;

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

        document.getElementById('addActivityButton').addEventListener('click', () => {
            this.showAddActivityModal();
        });

        document.getElementById('backButton').addEventListener('click', () => {
            this.showMainView();
        });

        document.getElementById('deleteStudentButton').addEventListener('click', () => {
            this.enterDeleteMode('student');
        });

        document.getElementById('cancelStudentButton').addEventListener('click', () => {
            this.exitDeleteMode('student');
        });

        document.getElementById('validateStudentButton').addEventListener('click', () => {
            this.confirmDelete();
            this.exitDeleteMode('student');
        });

        document.getElementById('deleteActivityButton').addEventListener('click', () => {
            this.enterDeleteMode('activity');
        });

        document.getElementById('cancelActivityButton').addEventListener('click', () => {
            this.exitDeleteMode('activity');
        });

        document.getElementById('validateActivityButton').addEventListener('click', () => {
            this.confirmDelete();
            this.exitDeleteMode('activity');
        });
    }

    enterDeleteMode(type) {
        this.deleteMode = true;
        this.deleteType = type;
        this.selectedIndexes = [];

        const deleteButton = type === 'student' ?
            document.getElementById('deleteStudentButton') :
            document.getElementById('deleteActivityButton');

        const cancelButton = type === 'student' ?
            document.getElementById('cancelStudentButton') :
            document.getElementById('cancelActivityButton');

        const validateButton = type === 'student' ?
            document.getElementById('validateStudentButton') :
            document.getElementById('validateActivityButton');

        deleteButton.classList.add('hidden');
        cancelButton.classList.remove('hidden');

        if (type === 'student') {
            this.setStudentDeleteMode(true);
        } else {
            this.setActivityDeleteMode(true);
        }
    }

    exitDeleteMode(type) {
        this.deleteMode = false;
        this.selectedIndexes = [];
        this.deleteType = null;

        const deleteButton = type === 'student' ?
            document.getElementById('deleteStudentButton') :
            document.getElementById('deleteActivityButton');

        const cancelButton = type === 'student' ?
            document.getElementById('cancelStudentButton') :
            document.getElementById('cancelActivityButton');

        const validateButton = type === 'student' ?
            document.getElementById('validateStudentButton') :
            document.getElementById('validateActivityButton');

        deleteButton.classList.remove('hidden');
        cancelButton.classList.add('hidden');
        validateButton.classList.add('hidden');

        if (type === 'student') {
            this.setStudentDeleteMode(false);
        } else {
            this.setActivityDeleteMode(false);
        }
    }

    updateDeleteButton() {
        if (!this.deleteMode) return;

        const validateButton = this.deleteType === 'student' ?
            document.getElementById('validateStudentButton') :
            document.getElementById('validateActivityButton');

        if (this.selectedIndexes.length > 0) {
            validateButton.classList.remove('hidden');
        } else {
            validateButton.classList.add('hidden');
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

        if (this.students && this.students.length > 0) {

            const sortedStudents = this.students
                .map((student, index) => ({student, originalIndex: index}))
                .sort((a, b) => a.student.name.localeCompare(b.student.name));

            sortedStudents.forEach(({student, originalIndex}) => {
                const card = document.createElement('div');
                card.className = 'card';

                if (student.type === 'PS') {
                    card.classList.add('ps-student');
                } else if (student.type === 'MS') {
                    card.classList.add('ms-student');
                }

                card.innerHTML = `
                            ${student.name}
                        `;

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
            this.selectedIndexes.push(index);
            element.classList.add('selected');
        } else {
            this.selectedIndexes.splice(indexPosition, 1);
            element.classList.remove('selected');
        }

        this.updateDeleteButton();
    }

    confirmDelete() {
        if (this.selectedIndexes.length === 0) return;

        if (this.deleteType === 'student') {
            const sortedIndexes = this.selectedIndexes.sort((a, b) => b - a);

            sortedIndexes.forEach(index => {
                this.students.splice(index, 1);
            });

            this.renderStudents();
        } else if (this.deleteType === 'activity') {
            const sortedIndexes = this.selectedIndexes.sort((a, b) => b - a);

            sortedIndexes.forEach(index => {
                this.activities.splice(index, 1);
            });

            this.students.forEach(student => {
                if (student.activityStates) {
                    const newStates = {};
                    Object.keys(student.activityStates).forEach(key => {
                        const keyIndex = parseInt(key);
                        let newIndex = keyIndex;
                        sortedIndexes.forEach(deletedIndex => {
                            if (keyIndex > deletedIndex) {
                                newIndex--;
                            }
                        });

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

        this.exitDeleteMode('activity');
    }

    showMainView() {
        this.currentStudent = null;
        document.getElementById('mainView').classList.remove('hidden');
        document.getElementById('studentView').classList.remove('active');

        this.exitDeleteMode('student');
    }

    renderActivities() {
        const container = document.getElementById('activitiesContainer');
        container.innerHTML = '';

        if (this.activities && this.activities.length > 0) {

            const reversedActivities = [...this.activities].reverse();

            reversedActivities.forEach((activity, reversedIndex) => {

                const originalIndex = this.activities.length - 1 - reversedIndex;

                const card = document.createElement('div');
                card.className = 'activity-card';

                const student = this.students[this.currentStudent];
                const state = student.activityStates[originalIndex] || 0;

                const states = ['', 'valide', 'acquis', 'non-acquis'];
                if (state > 0) {
                    card.classList.add(states[state]);
                }

                card.innerHTML = `
                            ${activity.name}
                        `;

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
        const newState = (currentState + 1) % 4;

        if (newState === 0) {
            delete student.activityStates[activityIndex];
        } else {
            student.activityStates[activityIndex] = newState;
        }

        this.saveData();
        this.renderActivities();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new StudentActivityApp();
});