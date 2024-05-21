const { app, BrowserWindow, Menu, ipcMain } = require('electron');

let win;
let addressWindow;
let cartWindow;
let addresses = [];
let cart = [];

// Mağazayı başlatmak için bir fonksiyon oluşturuyoruz.
async function initializeStore() {
    const Store = (await import('electron-store')).default;
    const store = new Store();
    addresses = store.get('addresses') || []; // Adresleri mağazadan alıyoruz.

    
    // Adresleri kaydetmek için bir fonksiyon oluşturuyoruz.
    function saveAddresses() {
        store.set('addresses', addresses);
    }
    
    // Sepeti kaydetmek için bir fonksiyon oluşturuyoruz.
    function saveCart() {
        store.set('cart', cart);
    }

    // Adres ekleme olayı için bir dinleyici oluşturuyoruz.
    ipcMain.on('add-address', (event, { address, type }) => {
        addresses.push({ address, type });
        saveAddresses();
        console.log('Address added:', address, type);
    });

    // Adres silme olayı için bir dinleyici oluşturuyoruz.
    ipcMain.on('delete-address', (event, addressToDelete) => {
        addresses = addresses.filter(({ address }) => address !== addressToDelete);
        saveAddresses();
        console.log('Address deleted:', addressToDelete);
    });

    // Adresleri istemek için bir dinleyici oluşturuyoruz.
    ipcMain.on('request-addresses', (event) => {
        event.sender.send('load-addresses', addresses);
    });

    ipcMain.on('wb', (event, data) => {
        console.log('opened:', data);
    });

    ipcMain.on('room', (event, data) => {
        console.log('opened:', data);
    });

    ipcMain.on('bd', (event, data) => {
        console.log('opened:', data);
    });

    ipcMain.on('tulips', (event, data) => {
        console.log('opened:', data);
    });

    // Sepete ürün ekleme olayı için bir dinleyici oluşturuyoruz.
    ipcMain.on('add-to-cart', (event, item) => {
        const existingItem = cart.find(cartItem => cartItem.id === item.id);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ ...item, quantity: 1 });
        }
        saveCart();
        console.log('Item added to cart:', item);
    });

    // Sepeti güncelleme olayı için bir dinleyici oluşturuyoruz.
    ipcMain.on('update-cart', (event, updatedCart) => {
        cart = updatedCart;
        saveCart();
        if (cartWindow) {
            cartWindow.webContents.send('load-cart', cart);
        }
    });

    // Sepeti temizleme olayı için bir dinleyici oluşturuyoruz.
    ipcMain.on('clear-cart', () => {
        cart = [];
        saveCart();
        if (cartWindow) {
            cartWindow.webContents.send('load-cart', cart);
        }
        cartWindow.webContents.send('cart-cleared');
    });

    ipcMain.on('open-cart', () => {
        if (!cartWindow) {
            createCartWindow();
        } else {
            cartWindow.show();
            cartWindow.webContents.send('load-cart', cart);
        }
    });

     // Sipariş verme olayı için bir dinleyici oluşturuyoruz.
    ipcMain.on('place-order', () => {
        console.log('Order received');
    });

    // Sepeti mağazadan alıyoruz.

    cart = store.get('cart') || [];
}

// Adres penceresini oluşturmak için bir fonksiyon oluşturuyoruz.
function createAddressWindow() {
    addressWindow = new BrowserWindow({
        width: 400,
        height: 300,
        parent: win,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
        }
    });

    // Pencere kapatıldığında adres penceresini null yapıyoruz.
    addressWindow.loadURL(`file://${__dirname}/addresses.html`);

    addressWindow.on('closed', () => {
        addressWindow = null;
    });
}

function createCartWindow() {
    cartWindow = new BrowserWindow({
        width: 400,
        height: 600,
        parent: win,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
        }
    });

    // Sepet penceresini oluşturmak için bir fonksiyon oluşturuyoruz.
    cartWindow.loadURL(`file://${__dirname}/shopping-cart.html`);

    cartWindow.on('closed', () => {
        cartWindow = null;
    });

    // Pencere yüklemesi bittiğinde sepeti yüklüyoruz.
    cartWindow.webContents.on('did-finish-load', () => {
        cartWindow.webContents.send('load-cart', cart);
    });
}

// Ana pencereyi oluşturmak için bir fonksiyon oluşturuyoruz.
function createWindow() {
    win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
        }
    });

    win.loadURL(`file://${__dirname}/main.html`);

    win.on('closed', () => {
        win = null;
    });
}

// Uygulama hazır olduğunda mağazayı başlatıyor ve ana pencereyi oluşturuyoruz.
app.on('ready', async () => {
    await initializeStore();
    createWindow();
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    Menu.setApplicationMenu(mainMenu);
});

// Ana menü şablonunu oluşturuyoruz.
const mainMenuTemplate = [
    {
        label: "Create",
        submenu: [
            {
                label: "Addresses",
                click() {
                    if (!addressWindow) {
                        createAddressWindow();
                    } else {
                        addressWindow.show();
                    }
                }
            },
        ]
    },
    {
        label: "DevTools",
        submenu: [
            {
                label: "Open DevTools",
                click(item, focussedWindow) {
                    focussedWindow.toggleDevTools();
                }
            }
        ]
    },
    {
        label: "Back",
        click() {
            win.webContents.goBack();
        },
    },
    {
        label: "Quit",
        role: "quit",
        accelerator: "Ctrl+Q"
    },
];

// Tüm pencereler kapatıldığında uygulamayı kapatıyoruz.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Uygulama etkinleştirildiğinde ana pencereyi yeniden oluşturuyoruz.
app.on('activate', () => {
    if (win === null) {
        createWindow();
    }
});
