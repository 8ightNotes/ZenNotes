class ZenNotesApp {
    constructor() {
        // Main properties
        this.notes = [];
        this.activeNoteId = null;
        this.activeTag = null;

        // DOM element references
        this.appContainer = document.getElementById('app-container');
        this.sidebar = document.querySelector('.sidebar');
        this.notesListPanel = document.querySelector('.notes-list-panel');
        this.editorPanel = document.querySelector('.editor-panel');

        // Sidebar controls
        this.newNoteBtn = document.getElementById('new-note-btn');
        this.themeToggleBtn = document.getElementById('theme-toggle-btn');
        this.focusModeBtn = document.getElementById('focus-mode-btn');
        this.exportBtn = document.getElementById('export-btn');
        this.importInput = document.getElementById('import-file');

        // Note list controls
        this.notesListContainer = document.getElementById('notes-list');
        this.searchInput = document.getElementById('search-input');
        this.sortSelect = document.getElementById('sort-select');
        this.tagsContainer = document.getElementById('tags-container');

        // Editor controls
        this.editorTitle = document.getElementById('editor-title');
        this.editorBody = document.getElementById('editor-body');
        this.editorPreview = document.getElementById('editor-preview');
        this.editorTags = document.getElementById('editor-tags');
        this.editorMeta = document.getElementById('editor-meta');
        this.deleteNoteBtn = document.getElementById('delete-note-btn');
        this.writeTab = document.querySelector('.tab-btn[data-tab="write"]');
        this.previewTab = document.querySelector('.tab-btn[data-tab="preview"]');

        // Templates
        this.noteItemTemplate = document.getElementById('note-item-template');
        
        // Ambient sound
        this.ambientBtns = document.querySelectorAll('.ambient-btn');
        this.audio = {
            rain: document.getElementById('audio-rain'),
            cafe: document.getElementById('audio-cafe')
        };

        // Initialize the app
        this._loadState();
        this._addEventListeners();
        this.render();
    }

    // --- STATE MANAGEMENT --- //

    _loadState() {
        const notesData = localStorage.getItem('zennotes-notes');
        this.notes = notesData ? JSON.parse(notesData) : [];
        this.activeNoteId = localStorage.getItem('zennotes-activeNoteId');

        // Theme
        const savedTheme = localStorage.getItem('zennotes-theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
        }
    }

    _saveState() {
        localStorage.setItem('zennotes-notes', JSON.stringify(this.notes));
        localStorage.setItem('zennotes-activeNoteId', this.activeNoteId);
    }
    
    _saveTheme(theme) {
        localStorage.setItem('zennotes-theme', theme);
    }

    // --- EVENT LISTENERS --- //

    _addEventListeners() {
        // Sidebar
        this.newNoteBtn.addEventListener('click', () => this.createNewNote());
        this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        this.focusModeBtn.addEventListener('click', () => this.toggleFocusMode());
        this.exportBtn.addEventListener('click', () => this.exportNotes());
        this.importInput.addEventListener('change', (e) => this.importNotes(e));

        // Note List
        this.searchInput.addEventListener('input', () => this.render());
        this.sortSelect.addEventListener('change', () => this.render());

        // Editor
        this.editorTitle.addEventListener('input', () => this._handleEditorChange());
        this.editorBody.addEventListener('input', () => this._handleEditorChange());
        this.editorTags.addEventListener('input', () => this._handleEditorChange());
        this.deleteNoteBtn.addEventListener('click', () => this.deleteActiveNote());

        // Tabs
        this.writeTab.addEventListener('click', () => this._switchTab('write'));
        this.previewTab.addEventListener('click', () => this._switchTab('preview'));
        
        // Ambient Sounds
        this.ambientBtns.forEach(btn => {
           btn.addEventListener('click', () => this._toggleSound(btn.dataset.sound));
        });
        
        // Mobile back button logic
        this.editorPanel.addEventListener('click', (e) => {
            if (window.innerWidth <= 600 && e.target.matches('.editor-header::before')) {
                this._showNotesListPanel();
            }
        });
    }

    // --- CORE NOTE LOGIC --- //

    createNewNote() {
        const newNote = {
            id: Date.now().toString(),
            title: 'Untitled Note',
            content: '',
            tags: [],
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
        };
        this.notes.unshift(newNote);
        this.activeNoteId = newNote.id;
        this._saveState();
        this.render();
        this.editorTitle.focus();
        this.editorTitle.select();
    }

    deleteActiveNote() {
        if (!this.activeNoteId) return;

        if (confirm('Are you sure you want to delete this note?')) {
            this.notes = this.notes.filter(note => note.id !== this.activeNoteId);
            this.activeNoteId = this.notes.length > 0 ? this.notes[0].id : null;
            this._saveState();
            this.render();
        }
    }

    _handleEditorChange() {
        const activeNote = this.getActiveNote();
        if (!activeNote) return;

        activeNote.title = this.editorTitle.value;
        activeNote.content = this.editorBody.value;
        activeNote.tags = this.editorTags.value.split(',').map(tag => tag.trim()).filter(Boolean);
        activeNote.modified = new Date().toISOString();

        this._saveState();
        this.renderNoteList(); // Re-render list for title/snippet changes
        this.renderEditor(); // Update meta like word count
    }

    _handleNoteSelection(noteId) {
        this.activeNoteId = noteId;
        this._saveState();
        this.render();
        
        if (window.innerWidth <= 600) {
            this._showEditorPanel();
        }
    }

    // --- RENDER METHODS --- //

    render() {
        this.renderNoteList();
        this.renderEditor();
        this.renderTags();
    }

    renderNoteList() {
        this.notesListContainer.innerHTML = '';
        const filteredAndSortedNotes = this._getFilteredAndSortedNotes();

        if (filteredAndSortedNotes.length === 0 && this.searchInput.value === '') {
            this.notesListContainer.innerHTML = `<div class="empty-list-placeholder">Create your first note!</div>`;
        }

        filteredAndSortedNotes.forEach(note => {
            const noteElement = this.noteItemTemplate.content.cloneNode(true).firstElementChild;

            noteElement.dataset.noteId = note.id;
            noteElement.querySelector('.note-item-title').textContent = note.title || 'Untitled Note';
            noteElement.querySelector('.note-item-snippet').textContent = note.content.substring(0, 80) || 'No content';
            noteElement.querySelector('.note-item-date').textContent = new Date(note.modified).toLocaleString();
            
            const tagsContainer = noteElement.querySelector('.note-item-tags');
            tagsContainer.innerHTML = '';
            note.tags.forEach(tag => {
                const tagEl = document.createElement('span');
                tagEl.className = 'note-item-tag';
                tagEl.textContent = tag;
                tagsContainer.appendChild(tagEl);
            });

            if (note.id === this.activeNoteId) {
                noteElement.classList.add('selected');
            }

            noteElement.addEventListener('click', () => this._handleNoteSelection(note.id));
            this.notesListContainer.appendChild(noteElement);
        });
    }

    renderEditor() {
        const activeNote = this.getActiveNote();
        if (activeNote) {
            this.editorPanel.style.display = 'flex';
            this.editorTitle.value = activeNote.title;
            this.editorBody.value = activeNote.content;
            this.editorTags.value = activeNote.tags.join(', ');
            this._updateEditorMeta(activeNote.content);
            this._updatePreview(activeNote.content);
        } else {
            this.editorPanel.style.display = 'none';
        }
    }
    
    renderTags() {
        const allTags = [...new Set(this.notes.flatMap(note => note.tags))];
        this.tagsContainer.innerHTML = '';
        
        const allBtn = document.createElement('button');
        allBtn.className = 'tag-filter';
        allBtn.textContent = 'All Notes';
        if (!this.activeTag) allBtn.classList.add('active');
        allBtn.addEventListener('click', () => {
           this.activeTag = null;
           this.render();
        });
        this.tagsContainer.appendChild(allBtn);

        allTags.forEach(tag => {
            const tagBtn = document.createElement('button');
            tagBtn.className = 'tag-filter';
            tagBtn.textContent = tag;
            if (this.activeTag === tag) tagBtn.classList.add('active');
            tagBtn.addEventListener('click', () => {
                this.activeTag = this.activeTag === tag ? null : tag;
                this.render();
            });
            this.tagsContainer.appendChild(tagBtn);
        });
    }

    _updateEditorMeta(content) {
        const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
        this.editorMeta.textContent = `Words: ${wordCount}`;
    }

    // --- HELPER & UTILITY METHODS --- //

    getActiveNote() {
        return this.notes.find(note => note.id === this.activeNoteId);
    }
    
    _getFilteredAndSortedNotes() {
        let notesToDisplay = [...this.notes];

        // Filtering
        const searchTerm = this.searchInput.value.toLowerCase();
        if (searchTerm) {
            notesToDisplay = notesToDisplay.filter(note => 
                note.title.toLowerCase().includes(searchTerm) || 
                note.content.toLowerCase().includes(searchTerm)
            );
        }
        
        if (this.activeTag) {
            notesToDisplay = notesToDisplay.filter(note => note.tags.includes(this.activeTag));
        }

        // Sorting
        const sortValue = this.sortSelect.value;
        notesToDisplay.sort((a, b) => {
            switch(sortValue) {
                case 'modified-desc': return new Date(b.modified) - new Date(a.modified);
                case 'created-desc': return new Date(b.created) - new Date(a.created);
                case 'created-asc': return new Date(a.created) - new Date(b.created);
                case 'title-asc': return a.title.localeCompare(b.title);
                case 'title-desc': return b.title.localeCompare(a.title);
                default: return 0;
            }
        });
        
        return notesToDisplay;
    }

    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        this._saveTheme(document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    }

    toggleFocusMode() {
        this.appContainer.classList.toggle('focus-mode');
    }

    _switchTab(tab) {
        if (tab === 'write') {
            this.writeTab.classList.add('active');
            this.previewTab.classList.remove('active');
            this.editorBody.style.display = 'block';
            this.editorPreview.style.display = 'none';
        } else {
            this.writeTab.classList.remove('active');
            this.previewTab.classList.add('active');
            this.editorBody.style.display = 'none';
            this.editorPreview.style.display = 'block';
        }
    }
    
    _updatePreview(markdown) {
        this.editorPreview.innerHTML = marked.parse(markdown, { gfm: true, breaks: true });
    }

    exportNotes() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.notes, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `zennotes_backup_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }
    
    importNotes(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedNotes = JSON.parse(e.target.result);
                // Basic validation
                if (Array.isArray(importedNotes) && importedNotes.every(n => n.id && n.title !== undefined)) {
                    if (confirm(`This will add ${importedNotes.length} notes to your library. Continue?`)) {
                        this.notes = [...this.notes, ...importedNotes];
                        this._saveState();
                        this.render();
                    }
                } else {
                    alert('Invalid file format.');
                }
            } catch (error) {
                alert('Error reading or parsing file.');
            } finally {
                // Reset input value to allow importing the same file again
                this.importInput.value = '';
            }
        };
        reader.readAsText(file);
    }
    
    _toggleSound(soundName) {
        const btn = document.querySelector(`.ambient-btn[data-sound="${soundName}"]`);
        const audioEl = this.audio[soundName];
        
        if (audioEl.paused) {
            // Pause all other sounds before playing a new one
            Object.values(this.audio).forEach(a => a.pause());
            this.ambientBtns.forEach(b => b.classList.remove('active'));
            
            audioEl.play();
            btn.classList.add('active');
        } else {
            audioEl.pause();
            btn.classList.remove('active');
        }
    }
    
    // --- Mobile View Handlers --- //
    _showEditorPanel() {
        this.notesListPanel.classList.add('is-hidden');
        this.editorPanel.classList.add('is-active');
    }
    
    _showNotesListPanel() {
        this.notesListPanel.classList.remove('is-hidden');
        this.editorPanel.classList.remove('is-active');
    }
}

// Instantiate the app once the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ZenNotesApp();
});