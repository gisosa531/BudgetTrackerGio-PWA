let db;
let budgetVersion;
window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

// Create a new db request for a "budget" database.
const request = indexedDB.open('BudgetDB', budgetVersion || 1);

function checkForIndexedDb() {
    if (!window.indexedDB) {
        console.log("Your browser doesn't support a stable version of IndexedDB.");
        return false;
    }
    return true;
}


request.onupgradeneeded = function (e) {
    console.log('Upgrade needed in IndexDB');

    const { oldVersion } = e;
    const newVersion = e.newVersion || db.version;

    console.log(`DB Updated from version ${oldVersion} to ${newVersion}`);

    let db = e.target.result;

    if (db.objectStoreNames.length === 0) {
        db.createObjectStore('BudgetStore', { autoIncrement: true });
    }
};

request.onsuccess = function (event) {
    console.log('success');
    db = event.target.result;

    // Check if app is online before reading from db
    if (navigator.onLine) {
        console.log('Backend online! 🗄️');
        checkDatabase();
    }
};

request.onerror = function (event) {
    console.log(`Woops! ${event.target.errorCode}`);
};

function checkDatabase() {
    console.log('check db invoked');

    // Open a transaction on your BudgetStore db
    let transaction = db.transaction(['BudgetStore'], 'readwrite');

    // access your BudgetStore object
    const store = transaction.objectStore('BudgetStore');

    // Get all records from store and set to a variable
    const getAll = store.getAll();

    // If the request was successful
    getAll.onsuccess = function() {
        // If there are items in the store, we need to bulk add them when we are back online
        if (getAll.result.length > 0) {
            fetch('/api/transaction/bulk', {
                method: 'POST',
                body: JSON.stringify(getAll.result),
                headers: {
                    Accept: 'application/json, text/plain, */*',
                    'Content-Type': 'application/json',
                },
            })
                .then((response) => response.json())
                .then((res) => {
                    // If our returned response is not empty
                    if (res.length !== 0) {
                        // Open another transaction to BudgetStore with the ability to read and write
                        transaction = db.transaction(['BudgetStore'], 'readwrite');

                        // Assign the current store to a variable
                        const Store = transaction.objectStore('BudgetStore');

                        // Clear existing entries because our bulk add was successful
                        Store.clear();
                        console.log('Clearing store 🧹');
                    }
                });
        }
    };
}


const saveRecord = (record) => {
    console.log('Save record invoked');
    // Create a transaction on the BudgetStore db with readwrite access
    const transaction = db.transaction(['BudgetStore'], 'readwrite');

    // Access your BudgetStore object store
    const store = transaction.objectStore('BudgetStore');

    // Add record to your store with add method.
    store.add(record);
};

// Listen for app coming back online
window.addEventListener('online', checkDatabase);