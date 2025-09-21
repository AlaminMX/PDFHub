// Global state
let files = [];
let categories = [
    { id: 'uncategorized', name: 'Uncategorized', color: 'bg-gray-100 text-gray-700' },
    { id: 'work', name: 'Work', color: 'bg-red-100 text-red-700' },
    { id: 'personal', name: 'Personal', color: 'bg-blue-100 text-blue-700' },
    { id: 'finance', name: 'Finance', color: 'bg-green-100 text-green-700' }
];
let selectedCategory = 'all';
let isLoading = true;
let pdfJsLoaded = false;
let pdfJsError = false;
let currentError = null;

// PDF viewer state
let viewingPDF = null;
let currentPage = 1;
let totalPages = 0;
let scale = 1.0;
let rotation = 0;
let pdfDoc = null;
let isLoadingPDF = false;

// Touch/swipe state
let touchStart = null;
let touchEnd = null;

// Category colors
const categoryColors = [
    'bg-red-100 text-red-700',
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-yellow-100 text-yellow-700',
    'bg-purple-100 text-purple-700',
    'bg-pink-100 text-pink-700',
    'bg-indigo-100 text-indigo-700',
    'bg-orange-100 text-orange-700'
];

// DOM elements
let elements = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    loadPDFJS();
    loadDataFromStorage();
});

function initializeElements() {
    elements = {
        loadingScreen: document.getElementById('loading-screen'),
        mainContainer: document.getElementById('main-container'),
        errorDisplay: document.getElementById('error-display'),
        errorMessage: document.getElementById('error-message'),
        dismissError: document.getElementById('dismiss-error'),
        pdfJsLoading: document.getElementById('pdfjs-loading'),
        pdfJsError: document.getElementById('pdfjs-error'),
        mobileCategoriesBtn: document.getElementById('mobile-categories-btn'),
        mobileCategoriesText: document.getElementById('mobile-categories-text'),
        categoriesSidebar: document.getElementById('categories-sidebar'),
        addCategoryBtn: document.getElementById('add-category-btn'),
        newCategoryForm: document.getElementById('new-category-form'),
        newCategoryInput: document.getElementById('new-category-input'),
        saveCategoryBtn: document.getElementById('save-category-btn'),
        cancelCategoryBtn: document.getElementById('cancel-category-btn'),
        allFilesBtn: document.getElementById('all-files-btn'),
        allFilesCount: document.getElementById('all-files-count'),
        categoriesList: document.getElementById('categories-list'),
        uploadArea: document.getElementById('upload-area'),
        fileInput: document.getElementById('file-input'),
        chooseFilesBtn: document.getElementById('choose-files-btn'),
        fileListContainer: document.getElementById('file-list-container'),
        fileListTitle: document.getElementById('file-list-title-text'),
        downloadAllBtn: document.getElementById('download-all-btn'),
        clearAllBtn: document.getElementById('clear-all-btn'),
        fileList: document.getElementById('file-list'),
        emptyCategory: document.getElementById('empty-category'),
        emptyFiles: document.getElementById('empty-files'),
        pdfViewer: document.getElementById('pdf-viewer'),
        closePdfBtn: document.getElementById('close-pdf-btn'),
        pdfTitle: document.getElementById('pdf-title'),
        prevPageBtn: document.getElementById('prev-page-btn'),
        nextPageBtn: document.getElementById('next-page-btn'),
        pageInfo: document.getElementById('page-info'),
        zoomOutBtn: document.getElementById('zoom-out-btn'),
        zoomInBtn: document.getElementById('zoom-in-btn'),
        zoomInfo: document.getElementById('zoom-info'),
        rotateBtn: document.getElementById('rotate-btn'),
        downloadPdfBtn: document.getElementById('download-pdf-btn'),
        pdfContent: document.getElementById('pdf-content'),
        pdfLoading: document.getElementById('pdf-loading'),
        pdfError: document.getElementById('pdf-error'),
        downloadFallbackBtn: document.getElementById('download-fallback-btn'),
        pdfCanvas: document.getElementById('pdf-canvas'),
        pdfFooter: document.getElementById('pdf-footer'),
        firstPageBtn: document.getElementById('first-page-btn'),
        prevPageFooterBtn: document.getElementById('prev-page-footer-btn'),
        pageInput: document.getElementById('page-input'),
        totalPages: document.getElementById('total-pages'),
        nextPageFooterBtn: document.getElementById('next-page-footer-btn'),
        lastPageBtn: document.getElementById('last-page-btn'),
        deleteModal: document.getElementById('delete-modal'),
        deleteMessage: document.getElementById('delete-message'),
        cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
        confirmDeleteBtn: document.getElementById('confirm-delete-btn')
    };
}

function setupEventListeners() {
    // Error handling
    elements.dismissError.addEventListener('click', dismissError);

    // Mobile categories toggle
    elements.mobileCategoriesBtn.addEventListener('click', toggleMobileCategories);

    // Category management
    elements.addCategoryBtn.addEventListener('click', showNewCategoryForm);
    elements.saveCategoryBtn.addEventListener('click', addCategory);
    elements.cancelCategoryBtn.addEventListener('click', hideNewCategoryForm);
    elements.newCategoryInput.addEventListener('keydown', handleCategoryInputKeydown);
    elements.allFilesBtn.addEventListener('click', () => selectCategory('all'));

    // File upload
    elements.uploadArea.addEventListener('dragover', handleDragOver);
    elements.uploadArea.addEventListener('dragleave', handleDragLeave);
    elements.uploadArea.addEventListener('drop', handleDrop);
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.chooseFilesBtn.addEventListener('click', () => elements.fileInput.click());

    // File list actions
    elements.downloadAllBtn.addEventListener('click', downloadAll);
    elements.clearAllBtn.addEventListener('click', clearAllFiles);

    // PDF viewer
    elements.closePdfBtn.addEventListener('click', closePDF);
    elements.prevPageBtn.addEventListener('click', () => goToPage(currentPage - 1));
    elements.nextPageBtn.addEventListener('click', () => goToPage(currentPage + 1));
    elements.zoomOutBtn.addEventListener('click', zoomOut);
    elements.zoomInBtn.addEventListener('click', zoomIn);
    elements.rotateBtn.addEventListener('click', rotatePDF);
    elements.downloadPdfBtn.addEventListener('click', () => downloadFile(viewingPDF));
    elements.downloadFallbackBtn.addEventListener('click', () => downloadFile(viewingPDF));
    elements.firstPageBtn.addEventListener('click', () => goToPage(1));
    elements.prevPageFooterBtn.addEventListener('click', () => goToPage(currentPage - 1));
    elements.pageInput.addEventListener('change', handlePageInputChange);
    elements.nextPageFooterBtn.addEventListener('click', () => goToPage(currentPage + 1));
    elements.lastPageBtn.addEventListener('click', () => goToPage(totalPages));

    // PDF canvas touch/mouse events
    elements.pdfCanvas.addEventListener('touchstart', handleTouchStart);
    elements.pdfCanvas.addEventListener('touchmove', handleTouchMove);
    elements.pdfCanvas.addEventListener('touchend', handleTouchEnd);
    elements.pdfCanvas.addEventListener('mousedown', handleMouseDown);
    elements.pdfCanvas.addEventListener('mousemove', handleMouseMove);
    elements.pdfCanvas.addEventListener('mouseup', handleMouseUp);
    elements.pdfCanvas.addEventListener('mouseleave', handleMouseLeave);

    // Delete modal
    elements.cancelDeleteBtn.addEventListener('click', cancelDeleteCategory);
    elements.confirmDeleteBtn.addEventListener('click', confirmDeleteCategory);

    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboardNavigation);
}

// PDF.js loading
function loadPDFJS() {
    try {
        if (typeof window !== 'undefined') {
            if (window.pdfjsLib) {
                pdfJsLoaded = true;
                elements.pdfJsLoading.classList.add('hidden');
                return;
            }

            elements.pdfJsLoading.classList.remove('hidden');

            // Set worker source
            if (window.pdfjsLib) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
                    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                pdfJsLoaded = true;
                pdfJsError = false;
                elements.pdfJsLoading.classList.add('hidden');
            } else {
                // Wait for PDF.js to load
                setTimeout(() => {
                    if (window.pdfjsLib) {
                        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
                            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                        pdfJsLoaded = true;
                        pdfJsError = false;
                        elements.pdfJsLoading.classList.add('hidden');
                    } else {
                        pdfJsError = true;
                        elements.pdfJsLoading.classList.add('hidden');
                        elements.pdfJsError.classList.remove('hidden');
                    }
                }, 2000);
            }
        }
    } catch (err) {
        console.error('Error loading PDF.js:', err);
        pdfJsError = true;
        elements.pdfJsLoading.classList.add('hidden');
        elements.pdfJsError.classList.remove('hidden');
    }
}

// Data loading and saving
async function loadDataFromStorage() {
    try {
        // Load categories
        const storedCategories = localStorage.getItem('pdf-organizer-categories');
        if (storedCategories) {
            categories = JSON.parse(storedCategories);
        }

        // Load files
        const storedFiles = localStorage.getItem('pdf-organizer-files');
        if (storedFiles) {
            const parsedFiles = JSON.parse(storedFiles);
            const restoredFiles = await Promise.all(
                parsedFiles.map(async (storedFile) => {
                    try {
                        const response = await fetch(storedFile.dataUrl);
                        const blob = await response.blob();
                        const file = new File([blob], storedFile.fileName, { type: 'application/pdf' });

                        return {
                            id: storedFile.id,
                            name: storedFile.name,
                            size: storedFile.size,
                            file: file,
                            dataUrl: storedFile.dataUrl,
                            categoryId: storedFile.categoryId || 'uncategorized'
                        };
                    } catch (err) {
                        console.error('Error restoring file:', storedFile.name, err);
                        return null;
                    }
                })
            );

            files = restoredFiles.filter(file => file !== null);
        }
    } catch (error) {
        console.error('Error loading data from localStorage:', error);
        showError('Failed to load saved files. Please refresh the page.');
    } finally {
        isLoading = false;
        elements.loadingScreen.classList.add('hidden');
        elements.mainContainer.classList.remove('hidden');
        updateUI();
    }
}


// define the async function

//function saveFilesToStorage() {
  //  if (!isLoading && files.length >= 0) {
   //     try {
  //          const filesToStore = files.map(file => ({
  //              id: file.id,
     //           name: file.name,
        //        size: file.size,
   //             dataUrl: file.dataUrl || '',
   //             fileName: file.file.name,
   //             categoryId: file.categoryId          }));
  //          localStorage.setItem('pdf-organizer-files', JSON.stringify(filesToStore));
 //       } catch (err) {
     //       console.error('Error saving files to localStorage:', err)
            //            showError('Failed to save files. Storage might be full.');
  //      }
 //   }
//}

function saveCategoriesToStorage() {
    if (!isLoading) {
        try {
            localStorage.setItem('pdf-organizer-categories', JSON.stringify(categories));
        } catch (err) {
            console.error('Error saving categories to localStorage:', err);
        }
    }
}

// Error handling
function showError(message) {
    currentError = message;
    elements.errorMessage.textContent = message;
    elements.errorDisplay.classList.remove('hidden');
}

function dismissError() {
    currentError = null;
    elements.errorDisplay.classList.add('hidden');
}

// Mobile categories toggle
function toggleMobileCategories() {
    elements.categoriesSidebar.classList.toggle('hidden');
}

// Category management
function showNewCategoryForm() {
    elements.newCategoryForm.classList.remove('hidden');
    elements.newCategoryInput.focus();
}

function hideNewCategoryForm() {
    elements.newCategoryForm.classList.add('hidden');
    elements.newCategoryInput.value = '';
}

function handleCategoryInputKeydown(e) {
    if (e.key === 'Enter') {
        addCategory();
    } else if (e.key === 'Escape') {
        hideNewCategoryForm();
    }
}

function addCategory() {
    const name = elements.newCategoryInput.value.trim();
    if (name) {
        try {
            const newCategory = {
                id: Math.random().toString(36).substr(2, 9),
                name: name,
                color: categoryColors[Math.floor(Math.random() * categoryColors.length)]
            };
            categories.push(newCategory);
            saveCategoriesToStorage();
            hideNewCategoryForm();
            updateUI();
        } catch (err) {
            console.error('Error adding category:', err);
            showError('Failed to add category.');
        }
    }
}

function selectCategory(categoryId) {
    selectedCategory = categoryId;
    elements.categoriesSidebar.classList.add('hidden'); // Hide mobile categories
    updateUI();
}

function editCategory(categoryId) {
    const category = categories.find(cat => cat.id === categoryId);
    if (category) {
        const newName = prompt('Enter new category name:', category.name);
        if (newName && newName.trim()) {
            category.name = newName.trim();
            saveCategoriesToStorage();
            updateUI();
        }
    }
}

function deleteCategory(categoryId) {
    const category = categories.find(cat => cat.id === categoryId);
    if (category) {
        elements.deleteMessage.textContent = 
            `Are you sure you want to delete the category "${category.name}"? All files in this category will be moved to "Uncategorized".`;
        elements.deleteModal.classList.remove('hidden');
        elements.confirmDeleteBtn.onclick = () => confirmDeleteCategory(categoryId);
    }
}

function confirmDeleteCategory(categoryId) {
    if (categoryId === 'uncategorized') return;

    try {
        // Move files to uncategorized
        files.forEach(file => {
            if (file.categoryId === categoryId) {
                file.categoryId = 'uncategorized';
            }
        });

        // Remove category
        categories = categories.filter(cat => cat.id !== categoryId);

        // Update selected category if needed
        if (selectedCategory === categoryId) {
            selectedCategory = 'all';
        }
        saveCategoriesToStorage();
        elements.deleteModal.classList.add('hidden');
        updateUI();
    } catch (err) {
        console.error('Error deleting category:', err);
        showError('Failed to delete category.');
    }
}

function cancelDeleteCategory() {
    elements.deleteModal.classList.add('hidden');
}

// File upload handling
function handleDragOver(e) {
    e.preventDefault();
    elements.uploadArea.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('drag-over');

    try {
        const droppedFiles = Array.from(e.dataTransfer.files);
        const pdfFiles = droppedFiles.filter(file => file.type === 'application/pdf');

        if (pdfFiles.length === 0) {
            showError('Please drop only PDF files.');
            return;
        }

        addFiles(pdfFiles);
    } catch (err) {
        console.error('Error handling dropped files:', err);
        showError('Failed to process dropped files.');
    }
}

function handleFileSelect(e) {
    try {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');

            if (pdfFiles.length === 0) {
                showError('Please select only PDF files.');
                return;
            }

            addFiles(pdfFiles);
        }
    } catch (err) {
        console.error('Error handling selected files:', err);
        showError('Failed to process selected files.');
    }
}

async function addFiles(newFiles) {
    try {
        dismissError();
        const pdfFiles = await Promise.all(
            newFiles.map(async (file) => {
                try {
                    const dataUrl = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = () => reject(new Error('Failed to read file'));
                        reader.readAsDataURL(file);
                    });

                    return {
                        id: Math.random().toString(36).substr(2, 9),
                        name: file.name.replace('.pdf', ''),
                        size: file.size,
                        file,
                        dataUrl,
                        categoryId: 'uncategorized'
                    };
                } catch (err) {
                    console.error('Error processing file:', file.name, err);
                    throw err;
                }
            })
        );

        files.push(...pdfFiles);
        updateUI();
    } catch (err) {
        console.error('Error adding files:', err);
        showError('Failed to add some files. Please try again.');
    }
}

// File management
function deleteFile(id) {
    try {
        files = files.filter(file => file.id !== id);
        updateUI();
    } catch (err) {
        console.error('Error deleting file:', err);
        showError('Failed to delete file.');
    }
}

function renameFile(id, newName) {
    try {
        const file = files.find(f => f.id === id);
        if (file && newName.trim()) {
            file.name = newName.trim();
            
            updateUI();
        }
    } catch (err) {
        console.error('Error renaming file:', err);
        showError('Failed to rename file.');
    }
}

function updateFileCategory(fileId, categoryId) {
    try {
        const file = files.find(f => f.id === fileId);
        if (file) {
            file.categoryId = categoryId;
            updateUI();
        }
    } catch (err) {
        console.error('Error updating file category:', err);
        showError('Failed to update file category.');
    }
}

function downloadFile(file) {
    try {
        const url = URL.createObjectURL(file.file);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${file.name}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Error downloading file:', err);
        showError('Failed to download file.');
    }
}

function downloadAll() {
    try {
        files.forEach(file => downloadFile(file));
    } catch (err) {
        console.error('Error downloading all files:', err);
        showError('Failed to download all files.');
    }
}

function clearAllFiles() {
    try {
        files = [];
        localStorage.removeItem('pdf-organizer-files');
        updateUI();
    } catch (err) {
        console.error('Error clearing files:', err);
        showError('Failed to clear files.');
    }
}

// PDF viewer
async function openPDF(file) {
    try {
        if (!pdfJsLoaded || !window.pdfjsLib) {
            showError('PDF viewer is not available. Please refresh the page and try again.');
            return;
        }

        viewingPDF = file;
        isLoadingPDF = true;
        elements.pdfViewer.classList.remove('hidden');
        elements.pdfTitle.textContent = file.name;
        elements.pdfLoading.classList.remove('hidden');
        elements.pdfError.classList.add('hidden');
        elements.pdfCanvas.classList.add('hidden');
        elements.pdfFooter.classList.remove('hidden');

        dismissError();

        const arrayBuffer = await file.file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        pdfDoc = pdf;
        totalPages = pdf.numPages;
        currentPage = 1;
        scale = 1.0;
        rotation = 0;

        updatePDFControls();
        setTimeout(() => renderPage(1), 100);
    } catch (error) {
        console.error('Error loading PDF:', error);
        showError('Failed to load PDF. The file might be corrupted or invalid.');
        elements.pdfError.classList.remove('hidden');
        elements.pdfFooter.classList.add('hidden');
    } finally {
        isLoadingPDF = false;
        elements.pdfLoading.classList.add('hidden');
    }
}

function closePDF() {
    viewingPDF = null;
    pdfDoc = null;
    currentPage = 1;
    totalPages = 0;
    scale = 1.0;
    rotation = 0;
    elements.pdfViewer.classList.add('hidden');
    dismissError();
}

async function renderPage(pageNum) {
    if (!pdfDoc || !elements.pdfCanvas) return;

    try {
        const page = await pdfDoc.getPage(pageNum);
        const canvas = elements.pdfCanvas;
        const context = canvas.getContext('2d');

        const viewport = page.getViewport({ scale, rotation });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };

        await page.render(renderContext).promise;
        elements.pdfCanvas.classList.remove('hidden');
    } catch (error) {
        console.error('Error rendering page:', error);
        showError('Failed to render PDF page');
    }
}

function goToPage(pageNum) {
    if (pageNum >= 1 && pageNum <= totalPages) {
        currentPage = pageNum;
        renderPage(pageNum);
        updatePDFControls();
    }
}

function zoomIn() {
    const newScale = Math.min(scale + 0.25, 3.0);
    scale = newScale;
    renderPage(currentPage);
    updatePDFControls();
}

function zoomOut() {
    const newScale = Math.max(scale - 0.25, 0.5);
    scale = newScale;
    renderPage(currentPage);
    updatePDFControls();
}

function rotatePDF() {
    rotation = (rotation + 90) % 360;
    renderPage(currentPage);
}

function updatePDFControls() {
    elements.pageInfo.textContent = `${currentPage}/${totalPages}`;
    elements.pageInput.value = currentPage;
    elements.totalPages.textContent = `of ${totalPages}`;
    elements.zoomInfo.textContent = `${Math.round(scale * 100)}%`;

    elements.prevPageBtn.disabled = currentPage <= 1;
    elements.nextPageBtn.disabled = currentPage >= totalPages;
    elements.prevPageFooterBtn.disabled = currentPage <= 1;
    elements.nextPageFooterBtn.disabled = currentPage >= totalPages;
    elements.firstPageBtn.disabled = currentPage <= 1;
    elements.lastPageBtn.disabled = currentPage >= totalPages;
    elements.zoomOutBtn.disabled = scale <= 0.5;
    elements.zoomInBtn.disabled = scale >= 3.0;
}

function handlePageInputChange(e) {
    const page = parseInt(e.target.value);
    if (page >= 1 && page <= totalPages) {
        goToPage(page);
    }
}

// Touch/swipe handling
function handleTouchStart(e) {
    touchEnd = null;
    touchStart = {
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY
    };
}

function handleTouchMove(e) {
    touchEnd = {
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY
    };
}

function handleTouchEnd() {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe = distanceX > 50;
    const isRightSwipe = distanceX < -50;
    const isVerticalSwipe = Math.abs(distanceY) > Math.abs(distanceX);

    if (!isVerticalSwipe) {
        if (isLeftSwipe && currentPage < totalPages) {
            goToPage(currentPage + 1);
        }
        if (isRightSwipe && currentPage > 1) {
            goToPage(currentPage - 1);
        }
    }
}

function handleMouseDown(e) {
    touchEnd = null;
    touchStart = {
        x: e.clientX,
        y: e.clientY
    };
}

function handleMouseMove(e) {
    if (touchStart) {
        touchEnd = {
            x: e.clientX,
            y: e.clientY
        };
    }
}

function handleMouseUp() {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe = distanceX > 100;
    const isRightSwipe = distanceX < -100;
    const isVerticalSwipe = Math.abs(distanceY) > Math.abs(distanceX);

    if (!isVerticalSwipe) {
        if (isLeftSwipe && currentPage < totalPages) {
            goToPage(currentPage + 1);
        }
        if (isRightSwipe && currentPage > 1) {
            goToPage(currentPage - 1);
        }
    }

    touchStart = null;
    touchEnd = null;
}

function handleMouseLeave() {
    touchStart = null;
    touchEnd = null;
}

// Keyboard navigation
function handleKeyboardNavigation(e) {
    if (!viewingPDF) return;

    switch (e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            if (currentPage > 1) goToPage(currentPage - 1);
            break;
        case 'ArrowRight':
            e.preventDefault();
            if (currentPage < totalPages) goToPage(currentPage + 1);
            break;
        case 'Home':
            e.preventDefault();
            goToPage(1);
            break;
        case 'End':
            e.preventDefault();
            goToPage(totalPages);
            break;
        case 'Escape':
            e.preventDefault();
            closePDF();
            break;
    }
}

// UI updates
function updateUI() {
    updateCategoriesList();
    updateFilesList();
    updateMobileCategoriesText();
}

function updateCategoriesList() {
    // Update all files count
    elements.allFilesCount.textContent = files.length;

    // Update all files button state
    elements.allFilesBtn.classList.toggle('active', selectedCategory === 'all');

    // Clear and rebuild categories list
    elements.categoriesList.innerHTML = '';

    categories.forEach(category => {
        const categoryElement = createCategoryElement(category);
        elements.categoriesList.appendChild(categoryElement);
    });
}

function createCategoryElement(category) {
    const div = document.createElement('div');
    div.className = 'category-item-wrapper';

    const button = document.createElement('button');
    button.className = `category-item ${selectedCategory === category.id ? 'active' : ''}`;
    button.onclick = () => selectCategory(category.id);

    const content = document.createElement('div');
    content.className = 'category-content';

    const info = document.createElement('div');
    info.className = 'category-info';

    const colorSpan = document.createElement('span');
    colorSpan.className = `category-color ${category.color.split(' ')[0]}`;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'category-name';
    nameSpan.textContent = category.name;

    info.appendChild(colorSpan);
    info.appendChild(nameSpan);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'category-actions';

    const countSpan = document.createElement('span');
    countSpan.className = 'category-count';
    countSpan.textContent = getFilesCountByCategory(category.id);

    actionsDiv.appendChild(countSpan);

    if (category.id !== 'uncategorized') {
        const editBtn = document.createElement('button');
        editBtn.className = 'category-action';
        editBtn.innerHTML = '✏️';
        editBtn.title = 'Edit category';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            editCategory(category.id);
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'category-action delete';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Delete category';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteCategory(category.id);
        };

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
    }

    content.appendChild(info);
    content.appendChild(actionsDiv);
    button.appendChild(content);
    div.appendChild(button);

    return div;
}

function updateFilesList() {
    const filteredFiles = getFilteredFiles();

    // Show/hide file list container
    if (filteredFiles.length > 0) {
        elements.fileListContainer.classList.remove('hidden');
        elements.emptyCategory.classList.add('hidden');
        elements.emptyFiles.classList.add('hidden');
    } else {
        elements.fileListContainer.classList.add('hidden');
        if (files.length > 0) {
            elements.emptyCategory.classList.remove('hidden');
            elements.emptyFiles.classList.add('hidden');
        } else {
            elements.emptyCategory.classList.add('hidden');
            elements.emptyFiles.classList.remove('hidden');
        }
    }

    // Update file list title
    const categoryName = selectedCategory === 'all' ? 'All Files' : 
        categories.find(cat => cat.id === selectedCategory)?.name || 'Unknown';
    elements.fileListTitle.textContent = `${categoryName} (${filteredFiles.length})`;

    // Show/hide download all button
    elements.downloadAllBtn.classList.toggle('hidden', filteredFiles.length <= 1);

    // Clear and rebuild file list
    elements.fileList.innerHTML = '';

    filteredFiles.forEach(file => {
        const fileElement = createFileElement(file);
        elements.fileList.appendChild(fileElement);
    });
}

function createFileElement(file) {
    const div = document.createElement('div');
    div.className = 'file-item';

    const content = document.createElement('div');
    content.className = 'file-content';

    // File icon
    const iconDiv = document.createElement('div');
    iconDiv.className = 'file-icon';
    iconDiv.innerHTML = '📄';

    // File info
    const infoDiv = document.createElement('div');
    infoDiv.className = 'file-info';

    const nameP = document.createElement('p');
    nameP.className = 'file-name';
    nameP.textContent = file.name;

    const metaDiv = document.createElement('div');
    metaDiv.className = 'file-meta';

    const sizeP = document.createElement('p');
    sizeP.className = 'file-size';
    sizeP.textContent = formatFileSize(file.size);

    const category = categories.find(cat => cat.id === file.categoryId);
    if (category) {
        const categorySpan = document.createElement('span');
        categorySpan.className = `file-category ${category.id}`;
        categorySpan.textContent = category.name;
        metaDiv.appendChild(categorySpan);
    }

    metaDiv.insertBefore(sizeP, metaDiv.firstChild);

    // Mobile category selector
    const mobileCategoryDiv = document.createElement('div');
    mobileCategoryDiv.className = 'mobile-category-selector';

    const categorySelect = document.createElement('select');
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        option.selected = cat.id === file.categoryId;
        categorySelect.appendChild(option);
    });
    categorySelect.onchange = (e) => updateFileCategory(file.id, e.target.value);

    mobileCategoryDiv.appendChild(categorySelect);

    // Mobile actions
    const mobileActionsDiv = document.createElement('div');
    mobileActionsDiv.className = 'mobile-actions';

    const viewBtn = createButton('View', '👁️', () => openPDF(file), 'btn btn-outline btn-sm', pdfJsError);
    const editBtn = createButton('', '✏️', () => startRename(file), 'btn btn-outline btn-sm');
    const downloadBtn = createButton('', '⬇️', () => downloadFile(file), 'btn btn-outline btn-sm');
    const deleteBtn = createButton('', '🗑️', () => deleteFile(file.id), 'btn btn-outline btn-sm');

    mobileActionsDiv.appendChild(viewBtn);
    mobileActionsDiv.appendChild(editBtn);
    mobileActionsDiv.appendChild(downloadBtn);
    mobileActionsDiv.appendChild(deleteBtn);

    infoDiv.appendChild(nameP);
    infoDiv.appendChild(metaDiv);
    infoDiv.appendChild(mobileCategoryDiv);
    infoDiv.appendChild(mobileActionsDiv);

    // Desktop actions
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'file-actions';

    const desktopCategorySelect = document.createElement('select');
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        option.selected = cat.id === file.categoryId;
        desktopCategorySelect.appendChild(option);
    });
    desktopCategorySelect.onchange = (e) => updateFileCategory(file.id, e.target.value);

    const desktopViewBtn = createButton('', '👁️', () => openPDF(file), 'btn btn-outline btn-sm', pdfJsError);
    const desktopEditBtn = createButton('', '✏️', () => startRename(file), 'btn btn-outline btn-sm');
    const desktopDownloadBtn = createButton('', '⬇️', () => downloadFile(file), 'btn btn-outline btn-sm');
    const desktopDeleteBtn = createButton('', '🗑️', () => deleteFile(file.id), 'btn btn-outline btn-sm');

    actionsDiv.appendChild(desktopCategorySelect);
    actionsDiv.appendChild(desktopViewBtn);
    actionsDiv.appendChild(desktopEditBtn);
    actionsDiv.appendChild(desktopDownloadBtn);
    actionsDiv.appendChild(desktopDeleteBtn);

    content.appendChild(iconDiv);
    content.appendChild(infoDiv);
    content.appendChild(actionsDiv);
    div.appendChild(content);

    return div;
}

function createButton(text, icon, onClick, className, disabled = false) {
    const button = document.createElement('button');
    button.className = className;
    button.disabled = disabled;
    button.onclick = onClick;
    
    if (icon) {
        button.innerHTML = icon;
    }
    if (text) {
        button.innerHTML += ` ${text}`;
    }
    
    return button;
}

function startRename(file) {
    const newName = prompt('Enter new file name:', file.name);
    if (newName && newName.trim()) {
        renameFile(file.id, newName.trim());
    }
}

function updateMobileCategoriesText() {
    const categoryName = selectedCategory === 'all' ? 'All Files' : 
        categories.find(cat => cat.id === selectedCategory)?.name || 'Unknown';
    elements.mobileCategoriesText.textContent = `Categories (${categoryName})`;
}

// Utility functions
function getFilteredFiles() {
    if (selectedCategory === 'all') return files;
    return files.filter(file => file.categoryId === selectedCategory);
}

function getFilesCountByCategory(categoryId) {
    return files.filter(file => file.categoryId === categoryId).length;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}