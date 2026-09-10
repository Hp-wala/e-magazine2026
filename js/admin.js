const loginForm = document.getElementById('login-form');
const uploadForm = document.getElementById('upload-form');
const dashboard = document.getElementById('dashboard');
const statusMessage = document.getElementById('status');

// Development-only credentials. Move this object behind the auth endpoint before production.
const ADMIN_CONFIG = {
    username: 'admin',
    password: 'admin123'
};
const AUTH_SESSION_KEY = 'magazine-admin-authenticated';
const MAGAZINE_STORAGE_KEY = 'english-department-magazine-pdf';
const EDITORS_STORAGE_KEY = 'english-department-editors';
const PEOPLE_STORAGE_KEY = 'english-department-people-v2';
const CATEGORIES_STORAGE_KEY = 'english-department-people-categories';
const ARCHIVE_STORAGE_KEY = 'english-department-magazine-archive';
const RECYCLE_BIN_STORAGE_KEY = 'english-department-magazine-recycle-bin';
const PROFILE_PHOTOS_STORAGE_KEY = 'english-department-profile-photos';
const FINAL_PEOPLE_CATEGORIES = [
    'Advisor',
    'Teacher Members',
    'Editor',
    'Assistant Editor',
    'Special Advisors',
    'Editorial Team'
];
const DEFAULT_ARCHIVE_ENTRIES = [
    { year: '2026', title: '2026 Collection', pdf: 'img/cv.pdf', people: [] }
];
const PROFILE_DIRECTORY = [
    { group: 'Advisor', people: [{ name: 'Dr. Montu Saikia', role: 'Advisor', photo: 'img/whispers-of-poetry.jpeg' }] },
    { group: 'Teacher Members', people: [
        ['Dr. Pulak Deka', 'img/e.jpeg'], ['Dimpi Basistha', 'img/imgechoes-thought.jpeg'], ['Pallab Jyoti Sarma', 'img/statuswindow_landing_page.jpg'],
        ['Ruchika Kashyap', 'img/imgechoes-of-thought.png'], ['Surashree Baruah', 'img/whispers-of-poetry.jpeg']
    ].map(([name, photo]) => ({ name, role: 'Teacher Member', photo })) },
    { group: 'Editorial Leadership', people: [
        ['Violina Deka', 'Editor', 'img/imgechoes-thought.jpeg'], ['Trisha Hazarika', 'Assistant Editor', 'img/e.jpeg'],
        ['Hrisikesh Sarma', 'Special Advisor to Editor', 'img/statuswindow_landing_page.jpg'], ['Irfan Farhad', 'Special Advisor to Editor', 'img/imgechoes-of-thought.png']
    ].map(([name, role, photo]) => ({ name, role, photo })) },
    { group: 'Editorial Team', people: [
        'Himadri Kumar', 'Kuntala Baharali', 'Mridushmita Kumar', 'Mrinmoy Sarma', 'Ritul Das', 'Priti Deka', 'Parbin Sultana',
        'Bhitali Kashyap', 'Maromi Sultana', 'Khusi Devi', 'Mandip Rajbongshi', 'Birina Sarania', 'Sumiya Hiussain',
        'Dipjyoti Kakati', 'Amrita Das', 'Tonmoy Nath'
    ].map((name, index) => {
        const noPhotoNames = new Set([]);
        return {
            name,
            role: 'Editorial Team',
            photo: noPhotoNames.has(name) ? '' : ['img/whispers-of-poetry.jpeg', 'img/imgechoes-thought.jpeg', 'img/e.jpeg', 'img/imgechoes-of-thought.png'][index % 4]
        };
    }) }
];

document.getElementById('show-password').addEventListener('change', event => {
    document.getElementById('password').type = event.target.checked ? 'text' : 'password';
});

function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.classList.toggle('error', isError);
}

function setFormStatus(id, message, isError = false) {
    const element = document.getElementById(id);
    element.textContent = message;
    element.classList.toggle('error', isError);
}

function setupFileDropzones() {
    document.querySelectorAll('.file-dropzone').forEach(dropzone => {
        const input = document.getElementById(dropzone.dataset.fileInput);
        const message = dropzone.querySelector('span');
        const defaultMessage = message.textContent;
        if (!input) return;

        const updateMessage = () => {
            message.textContent = input.files.length ? input.files[0].name : defaultMessage;
        };
        input.addEventListener('change', updateMessage);
        ['dragenter', 'dragover'].forEach(eventName => dropzone.addEventListener(eventName, event => {
            event.preventDefault();
            dropzone.classList.add('is-dragging');
        }));
        ['dragleave', 'drop'].forEach(eventName => dropzone.addEventListener(eventName, event => {
            event.preventDefault();
            dropzone.classList.remove('is-dragging');
        }));
        dropzone.addEventListener('drop', event => {
            const file = event.dataTransfer.files[0];
            if (!file) return;
            const transfer = new DataTransfer();
            transfer.items.add(file);
            input.files = transfer.files;
            updateMessage();
        });
    });
}

function setAuthenticated(authenticated) {
    loginForm.hidden = authenticated;
    dashboard.hidden = !authenticated;
}

function checkSession() {
    // Development gate: require a fresh login whenever the admin page opens.
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    setAuthenticated(false);
}

function getEditors() {
    try {
        return JSON.parse(localStorage.getItem(EDITORS_STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveEditors(editors) {
    localStorage.setItem(EDITORS_STORAGE_KEY, JSON.stringify(editors));
}

function getDefaultCategories() {
    return FINAL_PEOPLE_CATEGORIES;
}

function normalizeCategoryName(category, role = '') {
    const raw = String(category || role || 'Editorial Team').trim();
    const lower = raw.toLowerCase();
    const roleLower = String(role || '').trim().toLowerCase();

    if (roleLower.includes('assistant editor')) return 'Assistant Editor';
    if (roleLower.includes('special advisor')) return 'Special Advisors';
    if (roleLower.includes('editor')) return 'Editor';
    if (roleLower.includes('teacher member')) return 'Teacher Members';
    if (roleLower.includes('advisor')) return 'Advisor';

    if (lower === 'editorial leadership') return 'Editor';
    if (lower === 'writers' || lower === 'designers' || lower === 'photographers' || lower === 'contributors') return 'Editorial Team';

    if (raw === 'Advisor') return 'Advisor';
    if (raw === 'Teacher Members') return 'Teacher Members';
    if (raw === 'Editor') return 'Editor';
    if (raw === 'Assistant Editor') return 'Assistant Editor';
    if (raw === 'Special Advisors') return 'Special Advisors';
    if (raw === 'Editorial Team') return 'Editorial Team';

    return 'Editorial Team';
}

function getCategories() {
    try {
        const stored = JSON.parse(localStorage.getItem(CATEGORIES_STORAGE_KEY) || 'null');
        if (Array.isArray(stored) && stored.length) {
            const safe = FINAL_PEOPLE_CATEGORIES.filter(category => stored.some(item => normalizeCategoryName(item) === category));
            const saved = safe.length ? safe : getDefaultCategories();
            saveCategories(saved);
            return saved;
        }
    } catch {
        // Ignore malformed category storage and fall through to defaults.
    }
    const defaults = getDefaultCategories();
    saveCategories(defaults);
    return defaults;
}

function saveCategories(categories) {
    const safe = Array.isArray(categories) ? categories : getDefaultCategories();
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(FINAL_PEOPLE_CATEGORIES.filter(category => safe.includes(category) || safe.some(item => normalizeCategoryName(item) === category))));
}

function normalizePersonRecord(person) {
    if (!person || typeof person !== 'object') return null;
    const role = String(person.role || 'Member');
    const category = normalizeCategoryName(person.category || person.group || 'Editorial Team', role);
    const photo = String(person.photo || person.image || '');
    const record = {
        id: person.id || profileKey(person.name || 'person-' + Date.now()),
        name: String(person.name || ''),
        role,
        category,
        photo: photo.startsWith('data:') ? '' : photo,
        archiveYear: person.archiveYear || person.year || '',
        status: person.status || 'active'
    };
    if (!record.name) return null;
    return record;
}

function getPeople() {
    try {
        const stored = JSON.parse(localStorage.getItem(PEOPLE_STORAGE_KEY) || 'null');
        if (Array.isArray(stored) && stored.length) {
            return stored.map(normalizePersonRecord).filter(Boolean);
        }
    } catch {
        // continue to safe migration below
    }

    const migrated = [];
    try {
        PROFILE_DIRECTORY.forEach(section => {
            section.people.forEach(person => {
                const name = typeof person === 'string' ? person : person.name;
                const role = typeof person === 'string' ? 'Editorial Team' : person.role || section.group;
                const photo = typeof person === 'string' ? '' : person.photo || '';
                migrated.push({
                    id: profileKey(name),
                    name,
                    role,
                    category: section.group,
                    photo,
                    archiveYear: '',
                    status: 'active'
                });
            });
        });
    } catch {
        // Keep migration best-effort and safe.
    }

    const legacyEditors = getEditors();
    legacyEditors.forEach(name => {
        if (!migrated.some(person => person.name === name)) {
            migrated.push({ id: profileKey(name), name, role: 'Member', category: 'Editorial Team', photo: '', archiveYear: '', status: 'active' });
        }
    });

    if (!migrated.length) {
        return [];
    }

    savePeople(migrated);
    return migrated;
}

function savePeople(people) {
    localStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(people.map(normalizePersonRecord).filter(Boolean)));
}

function profileKey(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function getProfilePhotos() {
    try {
        return JSON.parse(localStorage.getItem(PROFILE_PHOTOS_STORAGE_KEY) || '{}');
    } catch {
        return {};
    }
}

function saveProfilePhotos(photos) {
    localStorage.setItem(PROFILE_PHOTOS_STORAGE_KEY, JSON.stringify(photos));
}

function readImageFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('The image could not be read.'));
        reader.readAsDataURL(file);
    });
}

function renderProfilePhotoAdmin() {
    const list = document.getElementById('profile-photo-admin-list');
    const storedPhotos = getProfilePhotos();
    list.replaceChildren();
    const people = getPeople();
    people.forEach(person => {
        const key = profileKey(person.name);
        const saved = storedPhotos[key] || {};
        const row = document.createElement('div');
        row.className = 'profile-photo-row';

        const preview = document.createElement('img');
        preview.className = 'profile-photo-preview';
        preview.src = saved.photo || person.photo || makeInitialAvatarSource(person.name);
        preview.alt = `${person.name} preview`;
        preview.style.objectPosition = `${saved.x ?? 50}% ${saved.y ?? 50}%`;
        preview.style.transform = `scale(${saved.zoom || 1})`;

        const info = document.createElement('div');
        const name = document.createElement('p');
        name.className = 'profile-photo-name';
        name.textContent = person.name;
        const role = document.createElement('p');
        role.className = 'profile-photo-role';
        role.textContent = `${person.category || 'People'} - ${person.role}`;
        info.append(name, role);

        const controls = document.createElement('div');
        controls.className = 'profile-photo-controls';
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.setAttribute('aria-label', `Upload photo for ${person.name}`);
        const zoomInput = document.createElement('input');
        zoomInput.type = 'range';
        zoomInput.min = '1';
        zoomInput.max = '2.5';
        zoomInput.step = '.05';
        zoomInput.value = saved.zoom || '1';
        zoomInput.title = 'Photo zoom';
        const positionInput = document.createElement('input');
        positionInput.type = 'range';
        positionInput.min = '0';
        positionInput.max = '100';
        positionInput.value = saved.x ?? '50';
        positionInput.title = 'Photo horizontal position';
        const verticalInput = document.createElement('input');
        verticalInput.type = 'range';
        verticalInput.min = '0';
        verticalInput.max = '100';
        verticalInput.value = saved.y ?? '50';
        verticalInput.title = 'Photo vertical position';
        const saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.textContent = 'Save';
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'danger-button';
        deleteButton.textContent = 'Reset';

        zoomInput.addEventListener('input', () => { preview.style.transform = `scale(${zoomInput.value})`; });
        const updatePosition = () => { preview.style.objectPosition = `${positionInput.value}% ${verticalInput.value}%`; };
        positionInput.addEventListener('input', updatePosition);
        verticalInput.addEventListener('input', updatePosition);
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) return showStatus('Please choose an image file.', true);
            const reader = new FileReader();
            reader.onload = () => { preview.src = reader.result; };
            reader.readAsDataURL(file);
        });
        saveButton.addEventListener('click', async () => {
            const file = fileInput.files[0];
            saveButton.disabled = true;
            saveButton.textContent = 'Saving...';
            showStatus(`Saving ${person.name} profile photo...`);
            try {
                let photo = saved.photo || '';
                if (file) photo = await readImageFile(file);
                const photos = getProfilePhotos();
                photos[key] = { photo, zoom: Number(zoomInput.value), x: Number(positionInput.value), y: Number(verticalInput.value) };
                saveProfilePhotos(photos);
                showStatus(`${person.name} profile photo saved.`);
                saveButton.textContent = 'Saved';
                setTimeout(() => {
                    saveButton.disabled = false;
                    saveButton.textContent = 'Save';
                }, 700);
            } catch (error) {
                saveButton.disabled = false;
                saveButton.textContent = 'Save';
                showStatus(error.message || 'Could not save profile photo.', true);
            }
        });
        deleteButton.addEventListener('click', () => {
            const photos = getProfilePhotos();
            delete photos[key];
            saveProfilePhotos(photos);
            renderProfilePhotoAdmin();
            showStatus(`${person.name} photo reset to default.`);
        });
        controls.append(fileInput, zoomInput, positionInput, verticalInput, saveButton, deleteButton);
        row.append(preview, info, controls);
        list.appendChild(row);
    });
}

function renderCategoryAdmin() {
    const list = document.getElementById('category-admin-list');
    const categories = getCategories();
    if (!list) return;
    list.replaceChildren();

    categories.forEach((category, index) => {
        const row = document.createElement('div');
        row.className = 'category-admin-row-item';
        const label = document.createElement('span');
        label.textContent = category;

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.textContent = 'Edit';
        editButton.addEventListener('click', () => {
            const next = window.prompt('Category name', category);
            if (!next || !next.trim()) return;
            const updated = getCategories();
            updated[index] = next.trim();
            saveCategories(updated);
            renderCategoryAdmin();
            renderCategorySelects();
            renderPeopleAdmin();
            showStatus('Category updated.');
        });

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'danger-button';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => {
            const people = getPeople();
            const inUse = people.some(person => person.category === category);
            if (inUse) {
                showStatus(`Cannot delete category “${category}” because people are still assigned to it.`, true);
                return;
            }
            if (!window.confirm(`Delete the “${category}” category?`)) return;
            const updated = getCategories().filter(item => item !== category);
            saveCategories(updated);
            renderCategoryAdmin();
            renderCategorySelects();
            showStatus('Category removed.');
        });

        row.append(label, editButton, deleteButton);
        list.appendChild(row);
    });
}

function renderCategorySelects() {
    const categorySelect = document.getElementById('editor-category');
    const filterSelect = document.getElementById('people-category-filter');
    const yearSelect = document.getElementById('editor-year');

    const categories = getCategories();
    if (categorySelect) {
        const previous = categorySelect.dataset.value || categorySelect.value;
        categorySelect.replaceChildren();
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
        categorySelect.value = categories.includes(previous) ? previous : categories[0] || '';
    }

    if (filterSelect) {
        filterSelect.replaceChildren();
        const all = document.createElement('option');
        all.value = 'all';
        all.textContent = 'All categories';
        filterSelect.appendChild(all);
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            filterSelect.appendChild(option);
        });
    }

    if (yearSelect) {
        yearSelect.replaceChildren();
        const years = Array.from(new Set(['2025', '2026', ...getArchiveEntries().map(entry => String(entry.year))])).filter(year => year === '2025' || year === '2026');
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });
        if (!yearSelect.value && years.length) yearSelect.value = years[0];
    }
}

function parseArchivePeopleText(text) {
    const lines = String(text || '')
        .split(/\r?\n|,/)
        .map(line => line.trim())
        .filter(Boolean);

    const people = lines.map(line => {
        const firstDash = line.includes('—') ? '—' : line.includes('|') ? '|' : line.includes('-') ? '-' : '';
        if (!firstDash) {
            return { name: line, category: 'Editorial Team' };
        }
        const idx = line.indexOf(firstDash);
        const name = line.slice(0, idx).trim();
        const category = line.slice(idx + firstDash.length).trim();
        const safeCategory = FINAL_PEOPLE_CATEGORIES.includes(category)
            ? category
            : normalizeCategoryName(category || 'Editorial Team', '');
        return { name, category: safeCategory };
    }).filter(item => item.name);

    return people;
}

function renderArchivePeopleCheckboxes(target, selected = []) {
    return;
}

function openPersonEditorForm(person, collectionYear = '') {
    if (!person || !person.name) return showStatus('No person record available to edit.', true);

    const form = document.getElementById('editor-add-form');
    const nameInput = document.getElementById('editor-name');
    const roleInput = document.getElementById('editor-role');
    const categorySelect = document.getElementById('editor-category');
    const yearSelect = document.getElementById('editor-year');
    const photoPreview = document.getElementById('editor-photo-preview');
    const photoInput = document.getElementById('editor-photo');
    const saveButton = document.getElementById('save-person-button');

    if (!form || !nameInput || !roleInput || !categorySelect || !yearSelect || !photoPreview || !photoInput || !saveButton) {
        return showStatus('The edit form is unavailable.', true);
    }

    nameInput.value = person.name;
    roleInput.value = person.role || 'Member';

    const categories = getCategories();
    const categoryValue = categories.includes(person.category) ? person.category : categories[0] || 'Editorial Team';
    categorySelect.replaceChildren();
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
    categorySelect.value = categoryValue;

    const yearValue = person.archiveYear || collectionYear || '';
    const hasYearOption = Array.from(yearSelect.options).some(option => option.value === yearValue);
    if (hasYearOption) {
        yearSelect.value = yearValue;
    } else if (yearSelect.options.length) {
        yearSelect.value = yearSelect.options[0].value;
    }

    photoPreview.src = person.photo || makeInitialAvatarSource(person.name);
    photoInput.dataset.existingPhoto = person.photo || '';
    saveButton.textContent = 'Update Person';
    form.dataset.editingPersonId = person.id;

    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function setupDynamicPeopleDelegation() {
    const peopleList = document.getElementById('editor-admin-list');
    const archivePeopleList = document.getElementById('archive-editors-edit');

    if (peopleList) {
        peopleList.addEventListener('click', event => {
            const button = event.target.closest('button');
            if (!button) return;
            const row = event.target.closest('.editor-admin-row');
            if (!row) return;

            const personId = button.getAttribute('data-person-id') || row.getAttribute('data-person-id');
            const person = getPeople().find(item => item.id === personId);
            if (!person) return showStatus('No saved People record found for that person.', true);

            if (button.getAttribute('data-action') === 'edit-person') {
                openPersonEditorForm(person);
                showStatus(`Editing ${person.name}.`);
                return;
            }

            if (button.getAttribute('data-action') === 'delete-person') {
                if (!window.confirm(`Move ${person.name} to the Recycle Bin?`)) return;
                const people = getPeople();
                const index = people.findIndex(item => item.id === person.id);
                if (index >= 0) {
                    moveToRecycleBin({
                        type: 'person',
                        id: person.id,
                        name: person.name,
                        role: person.role,
                        category: person.category,
                        archiveYear: person.archiveYear,
                        photo: person.photo,
                        status: person.status || 'active',
                        title: person.name,
                        year: person.archiveYear || ''
                    });
                    people.splice(index, 1);
                    savePeople(people);
                    renderPeopleAdmin();
                    renderArchivePeopleCheckboxes('archive-people-select');
                    renderArchivePeopleCheckboxes('archive-editors-edit');
                    renderArchiveDeleteOptions();
                    renderCategorySelects();
                    renderCategoryAdmin();
                    showStatus(`${person.name} moved to Recycle Bin.`);
                }
            }
        });
    }

    if (archivePeopleList) {
        archivePeopleList.addEventListener('click', event => {
            const button = event.target.closest('button');
            if (!button) return;
            const row = event.target.closest('.archive-editors-edit-row');
            if (!row) return;

            const year = document.getElementById('archive-edit-year')?.value || '';
            const name = button.getAttribute('data-person-name') || row.getAttribute('data-person-name');
            const personId = button.getAttribute('data-person-id') || row.getAttribute('data-person-id');
            const people = getPeople();
            const person = people.find(item => item.id === personId || item.name === name);

            if (button.getAttribute('data-action') === 'edit-person') {
                if (!person) return showStatus(`No saved People record found for ${name}.`, true);
                openPersonEditorForm(person, year);
                showStatus(`Editing ${person.name} for the ${year} collection.`);
                return;
            }

            if (button.getAttribute('data-action') === 'delete-person') {
                if (!window.confirm(`Remove ${name} from the ${year} collection?`)) return;
                const entries = getArchiveEntries();
                const target = entries.find(item => item.year === year);
                if (!target) return showStatus('Yearly collection not found.', true);
                const peopleList = Array.isArray(target.people) ? target.people : Array.isArray(target.editors) ? target.editors : [];
                const next = peopleList.filter(item => item !== name);
                target.people = next;
                target.editors = next;
                saveArchiveEntries(entries);
                renderArchiveDeleteOptions();
                renderArchivePeopleCheckboxes('archive-people-select');
                showStatus(`${name} removed from the ${year} collection.`);
            }
        });
    }
}

function renderPeopleAdmin() {
    const list = document.getElementById('editor-admin-list');
    const search = document.getElementById('people-search');
    const categoryFilter = document.getElementById('people-category-filter');
    const yearFilter = document.getElementById('people-year-filter');
    const people = getPeople();
    if (!list) return;

    list.replaceChildren();

    const term = (search?.value || '').trim().toLowerCase();
    const category = categoryFilter?.value || 'all';
    const year = yearFilter?.value || 'all';
    const visible = people.filter(person => {
        const matchesTerm = !term || person.name.toLowerCase().includes(term) || person.role.toLowerCase().includes(term);
        const matchesCategory = category === 'all' || person.category === category;
        const matchesYear = year === 'all' || person.archiveYear === year;
        return matchesTerm && matchesCategory && matchesYear;
    });

    if (!visible.length) {
        const empty = document.createElement('p');
        empty.textContent = 'No people found.';
        list.appendChild(empty);
        return;
    }

    visible.forEach(person => {
        const row = document.createElement('div');
        row.className = 'editor-admin-row';
        row.setAttribute('data-person-id', person.id);

        const photo = document.createElement('img');
        photo.className = 'people-admin-photo';
        photo.alt = `${person.name} photo`;
        photo.src = person.photo || makeInitialAvatarSource(person.name);

        const info = document.createElement('div');
        info.className = 'people-admin-info';
        const name = document.createElement('strong');
        name.textContent = person.name;
        const meta = document.createElement('span');
        meta.textContent = `${person.role} • ${person.category} • ${person.archiveYear || 'Unassigned year'}`;
        info.append(name, meta);

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.setAttribute('data-action', 'edit-person');
        editButton.setAttribute('data-person-id', person.id);
        editButton.textContent = 'Edit';

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'danger-button';
        deleteButton.setAttribute('data-action', 'delete-person');
        deleteButton.setAttribute('data-person-id', person.id);
        deleteButton.textContent = 'Delete';

        row.append(photo, info, editButton, deleteButton);
        list.appendChild(row);
    });
}

function makeInitialAvatarSource(name) {
    const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0].toUpperCase()).join('');
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#122936"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="26" fill="#7ce0c3">${initials}</text></svg>`)}`;
}

function normalizeArchiveEntry(entry) {
    if (!entry || typeof entry !== 'object') return null;
    const people = Array.isArray(entry.people)
        ? entry.people
        : Array.isArray(entry.editors)
            ? entry.editors
            : [];
    return {
        ...entry,
        people,
        editors: people
    };
}

function getArchiveEntries() {
    try {
        const storedEntries = localStorage.getItem(ARCHIVE_STORAGE_KEY);
        if (storedEntries === null) {
            saveArchiveEntries(DEFAULT_ARCHIVE_ENTRIES);
            return DEFAULT_ARCHIVE_ENTRIES;
        }
        const parsed = JSON.parse(storedEntries);
        const entries = Array.isArray(parsed)
            ? parsed.filter(entry => entry && entry.year !== '2024').map(normalizeArchiveEntry).filter(Boolean)
            : [];
        saveArchiveEntries(entries);
        return entries;
    } catch {
        return DEFAULT_ARCHIVE_ENTRIES.map(entry => normalizeArchiveEntry(entry));
    }
}

function saveArchiveEntries(entries) {
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(entries.map(normalizeArchiveEntry)));
}

function attachPersonToArchiveYear(person) {
    if (!person || !person.archiveYear) return { ok: true, message: 'No archive year selected.' };

    const entries = getArchiveEntries();
    const entry = entries.find(item => item.year === person.archiveYear);
    if (!entry) {
        return { ok: false, message: `Archive collection for ${person.archiveYear} does not exist. Person saved in People Management only.` };
    }

    const people = Array.isArray(entry.people) ? entry.people : [];
    const editors = Array.isArray(entry.editors) ? entry.editors : [];

    const nextPeople = Array.from(new Set([...people, person.name]));
    const nextEditors = Array.from(new Set([...editors, person.name]));

    entry.people = nextPeople;
    entry.editors = nextEditors;
    saveArchiveEntries(entries);

    return { ok: true, message: `${person.name} added to the ${person.archiveYear} magazine collection.` };
}

function getRecycleBinEntries() {
    try {
        const entries = JSON.parse(localStorage.getItem(RECYCLE_BIN_STORAGE_KEY) || '[]');
        return Array.isArray(entries) ? entries : [];
    } catch {
        return [];
    }
}

function saveRecycleBinEntries(entries) {
    localStorage.setItem(RECYCLE_BIN_STORAGE_KEY, JSON.stringify(entries));
}

function moveToRecycleBin(entry) {
    const trashEntry = { ...entry, deletedAt: new Date().toISOString() };
    saveRecycleBinEntries([...getRecycleBinEntries(), trashEntry]);
}

function renderRecycleBin() {
    const select = document.getElementById('recycle-bin-select');
    select.replaceChildren();
    getRecycleBinEntries().forEach((entry, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = `${entry.year} - ${entry.title}${entry.type === 'current' ? ' (Current)' : ''}`;
        select.appendChild(option);
    });
    const disabled = !select.options.length;
    select.disabled = disabled;
    document.getElementById('restore-recycle-button').disabled = disabled;
    document.getElementById('empty-recycle-button').disabled = disabled;
}

function renderArchiveDeleteOptions() {
    const select = document.getElementById('archive-delete-year');
    const editSelect = document.getElementById('archive-edit-year');
    const peopleList = document.getElementById('archive-editors-edit');
    select.replaceChildren();
    editSelect.replaceChildren();
    const entries = getArchiveEntries();
    entries.forEach(entry => {
        const option = document.createElement('option');
        option.value = entry.year;
        option.textContent = `${entry.year} - ${entry.title}`;
        select.appendChild(option);
        editSelect.appendChild(option.cloneNode(true));
    });
    select.disabled = !select.options.length;
    document.getElementById('delete-archive-button').disabled = !select.options.length;
    editSelect.disabled = !editSelect.options.length;
    document.getElementById('save-archive-editors').disabled = !editSelect.options.length;
    if (editSelect.value && entries.some(entry => entry.year === editSelect.value)) {
        // keep the selected year stable.
    } else if (entries.length) {
        editSelect.value = entries[0].year;
    }
    if (peopleList) renderArchiveCollectionPeopleList();
}

function renderArchiveCollectionPeopleList() {
    const list = document.getElementById('archive-editors-edit');
    const editSelect = document.getElementById('archive-edit-year');
    const year = editSelect?.value || '';
    if (!list || !year) return;

    const entry = getArchiveEntries().find(item => item.year === year);
    const names = Array.isArray(entry?.people)
        ? entry.people
        : Array.isArray(entry?.editors)
            ? entry.editors
            : [];

    list.replaceChildren();
    if (!names.length) {
        const empty = document.createElement('p');
        empty.textContent = 'No people connected to this collection yet.';
        list.appendChild(empty);
        return;
    }

    const allPeople = getPeople();
    names.forEach(name => {
        const person = allPeople.find(item => item.name === name);
        const row = document.createElement('div');
        row.className = 'archive-editors-edit-row';
        row.setAttribute('data-person-id', person?.id || profileKey(name));
        row.setAttribute('data-person-name', name);

        const photo = document.createElement('img');
        photo.className = 'people-admin-photo';
        photo.alt = `${name} photo`;
        photo.src = person?.photo || makeInitialAvatarSource(name);

        const info = document.createElement('div');
        info.className = 'people-admin-info';

        const title = document.createElement('strong');
        title.textContent = name;

        const meta = document.createElement('span');
        meta.textContent = `${person?.role || 'Member'} • ${person?.category || 'Editorial Team'} • ${year}`;

        info.append(title, meta);

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.setAttribute('data-action', 'edit-person');
        editButton.setAttribute('data-person-id', person?.id || profileKey(name));
        editButton.setAttribute('data-person-name', name);
        editButton.textContent = 'Edit';

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'danger-button';
        deleteButton.setAttribute('data-action', 'delete-person');
        deleteButton.setAttribute('data-person-id', person?.id || profileKey(name));
        deleteButton.setAttribute('data-person-name', name);
        deleteButton.textContent = 'Delete';

        row.append(photo, info, editButton, deleteButton);
        list.appendChild(row);
    });
}

function archiveCurrentMagazine(pdf) {
    const currentDate = new Date();
    const month = currentDate.getMonth();
    if (month !== 7 && month !== 8) return false;

    const year = String(currentDate.getFullYear());
    const entries = getArchiveEntries();
    const people = getEditors();
    const archivedEntry = {
        year,
        title: `${year} Collection`,
        pdf,
        people,
        editors: people
    };
    const existingIndex = entries.findIndex(entry => entry.year === year);
    if (existingIndex >= 0) entries[existingIndex] = archivedEntry;
    else entries.push(archivedEntry);
    saveArchiveEntries(entries);
    return true;
}

function readPdfFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('The PDF could not be read.'));
        reader.readAsDataURL(file);
    });
}

function renderEditors() {
    const list = document.getElementById('editor-admin-list');
    list.replaceChildren();
    const editors = getEditors();

    if (!editors.length) {
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = 'No people added yet.';
        list.appendChild(emptyMessage);
        return;
    }

    editors.forEach((name, index) => {
        const row = document.createElement('div');
        row.className = 'editor-admin-row';

        const input = document.createElement('input');
        input.value = name;
        input.setAttribute('aria-label', `Person ${index + 1} name`);

        const saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.textContent = 'Save';
        saveButton.addEventListener('click', () => {
            const updatedName = input.value.trim();
            if (!updatedName) return showStatus('Person name cannot be empty.', true);
            const updatedEditors = getEditors();
            updatedEditors[index] = updatedName;
            saveEditors(updatedEditors);
            renderEditors();
            showStatus('Person name updated.');
        });

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'danger-button';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => {
            const updatedEditors = getEditors();
            updatedEditors.splice(index, 1);
            saveEditors(updatedEditors);
            renderEditors();
            showStatus('Person removed.');
        });

        row.append(input, saveButton, deleteButton);
        list.appendChild(row);
    });
}

loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (username === ADMIN_CONFIG.username && password === ADMIN_CONFIG.password) {
        sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
        setAuthenticated(true);
        loginForm.reset();
        showStatus('Signed in.');
    } else {
        showStatus('Invalid username or password.', true);
    }
});

uploadForm.addEventListener('submit', async event => {
    event.preventDefault();
    const file = document.getElementById('magazine-file').files[0];
    const button = uploadForm.querySelector('button[type="submit"]');
    if (!file) {
        setFormStatus('upload-status', 'Please choose a PDF first.', true);
        return;
    }
    if (file.type !== 'application/pdf') {
        setFormStatus('upload-status', 'Only PDF files are allowed.', true);
        showStatus('Please choose a PDF file.', true);
        return;
    }

    button.disabled = true;
    button.textContent = 'Uploading...';
    setFormStatus('upload-status', 'Reading PDF and publishing...');
    showStatus('Saving magazine in this browser...');
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const previousMagazine = localStorage.getItem(MAGAZINE_STORAGE_KEY);
            const archived = previousMagazine ? archiveCurrentMagazine(previousMagazine) : false;
            localStorage.setItem(MAGAZINE_STORAGE_KEY, reader.result);
            uploadForm.reset();
            setFormStatus('upload-status', archived ? 'Published. Previous PDF moved to archive.' : 'Published successfully.');
            showStatus(archived
                ? 'Previous magazine moved to this year\'s archive. New magazine is current.'
                : 'Magazine replaced for this browser.');
        } catch {
            setFormStatus('upload-status', 'Upload failed: PDF is too large for browser storage.', true);
            showStatus('This PDF is too large for browser storage.', true);
        }
        button.disabled = false;
        button.textContent = 'Upload and publish';
    };
    reader.onerror = () => {
        setFormStatus('upload-status', 'Upload failed: the PDF could not be read.', true);
        showStatus('The PDF could not be read.', true);
        button.disabled = false;
        button.textContent = 'Upload and publish';
    };
    reader.readAsDataURL(file);
});

document.getElementById('logout-button').addEventListener('click', () => {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    setAuthenticated(false);
    showStatus('Signed out.');
});

document.getElementById('delete-magazine-button').addEventListener('click', () => {
    const currentMagazine = localStorage.getItem(MAGAZINE_STORAGE_KEY);
    if (!currentMagazine) {
        showStatus('No uploaded current magazine to delete.', true);
        return;
    }
    if (!window.confirm('Delete the current magazine from this browser?')) return;
    moveToRecycleBin({
        type: 'current',
        year: String(new Date().getFullYear()),
        title: 'Current E-Magazine',
        pdf: currentMagazine,
        editors: getEditors()
    });
    localStorage.removeItem(MAGAZINE_STORAGE_KEY);
    showStatus('Current magazine deleted.');
});

document.getElementById('delete-archive-button').addEventListener('click', () => {
    const year = document.getElementById('archive-delete-year').value;
    if (!year) return showStatus('No yearly collection selected.', true);
    if (!window.confirm(`Delete the ${year} collection from this browser?`)) return;
    const entries = getArchiveEntries();
    const entry = entries.find(item => item.year === year);
    if (entry) moveToRecycleBin({ ...entry, type: 'archive' });
    saveArchiveEntries(entries.filter(entry => entry.year !== year));
    renderArchiveDeleteOptions();
    renderRecycleBin();
    showStatus(`${year} collection deleted.`);
});

document.getElementById('restore-recycle-button').addEventListener('click', () => {
    const select = document.getElementById('recycle-bin-select');
    const index = Number(select.value);
    const trash = getRecycleBinEntries();
    const entry = trash[index];
    if (!entry) return showStatus('No deleted item selected.', true);

    if (entry.type === 'person') {
        const people = getPeople();
        if (!people.some(person => person.id === entry.id)) {
            people.push({
                id: entry.id || profileKey(entry.name),
                name: entry.name,
                role: entry.role || 'Member',
                category: entry.category || 'Editorial Team',
                photo: entry.photo || '',
                archiveYear: entry.archiveYear || entry.year || '',
                status: entry.status || 'active'
            });
        }
        savePeople(people);
        renderPeopleAdmin();
        renderCategoryAdmin();
        renderCategorySelects();
        renderArchivePeopleCheckboxes('archive-people-select');
    } else if (entry.type === 'current') {
        if (localStorage.getItem(MAGAZINE_STORAGE_KEY) && !window.confirm('Replace the current magazine with this deleted version?')) return;
        localStorage.setItem(MAGAZINE_STORAGE_KEY, entry.pdf);
    } else {
        const archives = getArchiveEntries();
        if (archives.some(item => item.year === entry.year)) return showStatus(`${entry.year} collection already exists.`, true);
        saveArchiveEntries([...archives, { year: entry.year, title: entry.title, pdf: entry.pdf, people: entry.people || entry.editors || [], editors: entry.people || entry.editors || [] }]);
        renderArchiveDeleteOptions();
    }

    trash.splice(index, 1);
    saveRecycleBinEntries(trash);
    renderRecycleBin();
    showStatus(entry.type === 'person' ? `${entry.name} restored successfully.` : `${entry.year} magazine restored.`);
});

document.getElementById('empty-recycle-button').addEventListener('click', () => {
    const select = document.getElementById('recycle-bin-select');
    const index = Number(select.value);
    const trash = getRecycleBinEntries();
    const entry = trash[index];
    if (!entry) return showStatus('No deleted item selected.', true);
    if (!window.confirm(`Permanently delete the ${entry.type === 'person' ? entry.name : entry.year} item?`)) return;
    trash.splice(index, 1);
    saveRecycleBinEntries(trash);
    renderRecycleBin();
    showStatus(entry.type === 'person' ? `${entry.name} permanently deleted.` : `${entry.year} magazine permanently deleted.`);
});

document.getElementById('archive-edit-year').addEventListener('change', () => {
    renderArchiveCollectionPeopleList();
});

document.getElementById('add-archive-person-button').addEventListener('click', () => {
    const year = document.getElementById('archive-edit-year').value;
    if (!year) return showStatus('Select a yearly collection first.', true);
    const form = document.getElementById('editor-add-form');
    form.reset();
    form.dataset.editingPersonId = '';
    document.getElementById('editor-photo-preview').removeAttribute('src');
    document.getElementById('editor-year').value = year;
    document.getElementById('editor-role').value = '';
    document.getElementById('editor-category').value = getCategories()[0] || 'Editorial Team';
    document.getElementById('save-person-button').textContent = 'Save Person';
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    showStatus(`Adding a person to the ${year} collection.`);
});

document.getElementById('save-archive-editors').addEventListener('click', () => {
    const year = document.getElementById('archive-edit-year').value;
    const saveButton = document.getElementById('save-archive-editors');
    if (!year) return showStatus('No yearly collection selected.', true);

    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    showStatus(`Saving ${year} collection people...`);

    const entries = getArchiveEntries();
    const entry = entries.find(item => item.year === year);
    if (!entry) {
        saveButton.disabled = false;
        saveButton.textContent = 'Save People';
        return showStatus('Yearly collection not found.', true);
    }

    const names = Array.isArray(entry.people) ? entry.people : Array.isArray(entry.editors) ? entry.editors : [];
    entry.people = Array.from(new Set(names));
    entry.editors = Array.from(new Set(names));
    saveArchiveEntries(entries);
    renderArchiveDeleteOptions();
    showStatus(`${year} people saved.`);
    saveButton.textContent = 'Saved';
    setTimeout(() => {
        saveButton.disabled = false;
        saveButton.textContent = 'Save People';
    }, 700);
});

document.getElementById('editor-add-form').addEventListener('submit', async event => {
    event.preventDefault();
    const name = document.getElementById('editor-name').value.trim();
    const role = document.getElementById('editor-role').value.trim();
    const category = document.getElementById('editor-category').value;
    const archiveYear = document.getElementById('editor-year').value;
    const photoInput = document.getElementById('editor-photo');
    const photoPreview = document.getElementById('editor-photo-preview');
    const editingId = event.target.dataset.editingPersonId || profileKey(name);
    if (!name || !category) {
        showStatus('Please complete person name and category.', true);
        return;
    }

    const people = getPeople();
    const existing = people.find(person => person.id === editingId || person.name === name);
    let photo = existing?.photo || '';

    if (photoInput.files && photoInput.files[0]) {
        try {
            photo = await readImageFile(photoInput.files[0]);
        } catch (error) {
            showStatus(error.message || 'Unable to read photo.', true);
            return;
        }
    }

    const record = {
        id: existing?.id || profileKey(name) || crypto?.randomUUID?.() || String(Date.now()),
        name,
        role: role || 'Member',
        category,
        photo,
        archiveYear,
        status: 'active'
    };

    if (existing) {
        Object.assign(existing, record);
    } else {
        people.push(record);
    }

    savePeople(people);
    saveEditors(people.map(person => person.name));

    const archiveAssignment = attachPersonToArchiveYear(record);

    renderPeopleAdmin();
    renderCategoryAdmin();
    renderCategorySelects();
    renderArchiveDeleteOptions();
    renderArchivePeopleCheckboxes('archive-people-select');
    renderArchiveCollectionPeopleList();
    renderProfilePhotoAdmin();
    event.target.reset();
    photoPreview.removeAttribute('src');
    event.target.dataset.editingPersonId = '';

    if (!archiveAssignment.ok) {
        showStatus(archiveAssignment.message, true);
    } else {
        showStatus('Person saved successfully.');
    }

    document.getElementById('save-person-button').textContent = 'Save Person';
});

document.getElementById('archive-add-form').addEventListener('submit', async event => {
    event.preventDefault();
    const year = document.getElementById('archive-year').value.trim();
    const title = document.getElementById('archive-title-input').value.trim();
    const selectedFile = document.getElementById('archive-pdf-file').files[0];
    const typedPeople = parseArchivePeopleText(document.getElementById('archive-people-select').value);
    const peopleNames = typedPeople.map(item => item.name);

    if (!year || !title || !selectedFile) {
        setFormStatus('archive-upload-status', 'Year, title, and PDF are required.', true);
        return;
    }
    if (getArchiveEntries().some(entry => entry.year === year)) {
        setFormStatus('archive-upload-status', `${year} collection already exists.`, true);
        showStatus(`${year} archive folder already exists.`, true);
        return;
    }

    const people = getPeople();
    typedPeople.forEach(item => {
        const existing = people.find(person => person.name === item.name);
        if (existing) {
            existing.category = item.category;
            existing.archiveYear = item.archiveYear || year;
            existing.role = existing.role || 'Member';
            existing.status = existing.status || 'active';
        } else {
            people.push({
                id: profileKey(item.name),
                name: item.name,
                role: 'Member',
                category: item.category,
                photo: '',
                archiveYear: year,
                status: 'active'
            });
        }
    });
    savePeople(people);

    const button = event.target.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Adding...';
    setFormStatus('archive-upload-status', 'Reading PDF and adding collection...');
    let pdf = '';
    if (selectedFile) {
        if (selectedFile.type !== 'application/pdf') {
            button.disabled = false;
            button.textContent = 'Add magazine';
            setFormStatus('archive-upload-status', 'Only PDF files are allowed.', true);
            return showStatus('Please choose a PDF file.', true);
        }
        try {
            pdf = await readPdfFile(selectedFile);
        } catch (error) {
            button.disabled = false;
            button.textContent = 'Add magazine';
            setFormStatus('archive-upload-status', error.message, true);
            return showStatus(error.message, true);
        }
    }

    saveArchiveEntries([...getArchiveEntries(), { year, title, pdf, people: peopleNames, editors: peopleNames }]);
    event.target.reset();
    document.getElementById('archive-people-select').value = '';
    renderArchiveDeleteOptions();
    renderPeopleAdmin();
    renderCategoryAdmin();
    renderCategorySelects();
    renderProfilePhotoAdmin();
    button.disabled = false;
    button.textContent = 'Add magazine';
    setFormStatus('archive-upload-status', `${year} collection added successfully.`);
    showStatus('Archive folder added.');
});

document.getElementById('add-category-button').addEventListener('click', () => {
    const input = document.getElementById('category-name');
    const text = input.value.trim();
    if (!text) return showStatus('Category name required.', true);
    const canonical = normalizeCategoryName(text);
    if (!FINAL_PEOPLE_CATEGORIES.includes(canonical)) {
        input.value = '';
        return showStatus('Only final categories are allowed.', true);
    }
    const categories = getCategories();
    if (!categories.includes(canonical)) {
        const safe = [...categories, canonical];
        saveCategories(safe);
        renderCategoryAdmin();
        renderCategorySelects();
        renderPeopleAdmin();
    }
    input.value = '';
    showStatus('Category confirmed.');
});

document.getElementById('cancel-person-edit').addEventListener('click', () => {
    const form = document.getElementById('editor-add-form');
    form.reset();
    form.dataset.editingPersonId = '';
    document.getElementById('save-person-button').textContent = 'Save Person';
    document.getElementById('editor-photo-preview').removeAttribute('src');
    showStatus('Edit cancelled.');
});

document.getElementById('editor-photo').addEventListener('change', event => {
    const file = event.target.files?.[0];
    const preview = document.getElementById('editor-photo-preview');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showStatus('Please choose an image file.', true);
        return;
    }
    const reader = new FileReader();
    reader.onload = () => {
        preview.src = reader.result;
    };
    reader.readAsDataURL(file);
});

document.getElementById('people-search').addEventListener('input', renderPeopleAdmin);
document.getElementById('people-category-filter').addEventListener('change', renderPeopleAdmin);
document.getElementById('people-year-filter').addEventListener('change', renderPeopleAdmin);

checkSession();
setupFileDropzones();
setupDynamicPeopleDelegation();
renderEditors();
renderCategoryAdmin();
renderCategorySelects();
renderPeopleAdmin();
renderProfilePhotoAdmin();
renderArchiveDeleteOptions();
renderArchivePeopleCheckboxes('archive-people-select');
renderRecycleBin();
