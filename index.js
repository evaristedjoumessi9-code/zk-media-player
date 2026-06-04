const {app, BrowserWindow,Menu,ipcMain,dialog,nativeImage} = require('electron');
var onrecording=!1;
const path = require('path');
var fs = require("fs");
var win = null;
var Fwin = null;
var Mwin = null;
var ksf = fs.readFileSync(path.join(__dirname,"ksf.sf2"));
console.log(__dirname)
// Cette fonction servira a creer la fenetre et un Tray
function createWindow(){
        win = new BrowserWindow({
            title: 'ZK Media Player',
            width:800,
            height:600,
            icon: nativeImage.createFromPath('float.ico'),
            backgroundColor: 'black',
            webPreferences:{
                preload: path.join(__dirname, 'preload.js')
            }
        })
        win.loadFile('ZKMediaPlayer.html');
        win.setBounds({
            width: 800,
            height:610
        });
    // on gere la demande de plein-ecran
    BrowserWindow.prototype.ZKFullScreen = (arg)=>{
        if(arg){
            Menu.setApplicationMenu(null);
        }else{
            Menu.setApplicationMenu(menu);
        }
        win.setFullScreen(arg);
    }
        ipcMain.on('fullscreen',()=>{
            win.ZKFullScreen(!win.isFullScreen());
         })
         ipcMain.on('win-name',(e,arg)=>{
                var q = arg.split('\\');
                win.setTitle(q[q.length - 1] + ' - ' + 'ZK Media Player');
         })
         ipcMain.on("reset-name",()=>{
            win.setTitle("ZK Media Player");
         })
         win.on("ready-to-show",()=>{
            if(process.argv[1] && process.argv[1] != "."){
                win.webContents.send("set-source",process.argv[1]);
              }
         })
}
app.on("browser-window-created",(e,w)=>{
    if(w.title!="ZK Media Player"){
        w.setMenuBarVisibility(false);
        w.setIcon(nativeImage.createFromPath('float.ico'));
        w.on("close",()=>{
            win.webContents.send("close-Annex");
        })
    }
})
ipcMain.on("requireSF",()=>{
    Mwin.webContents.send("sf",ksf.buffer)
})
// On verifie que l'application est prete ...
  app.whenReady().then(()=>{
    if(BrowserWindow.getAllWindows().length ===0){
        createWindow();
    }  // ... et on cree la fenetre
        app.on('activate',()=>{
            if(BrowserWindow.getAllWindows().length ===0){
                createWindow();
            }
        })
            
    })
    app.on('window-all-closed',()=>{
        if(process.platform !== 'darwin'){
                app.quit();
        }
    })

ipcMain.on("Unreadable-file",()=>{
    dialog.showErrorBox("Erreur fichier non supporté","Il se peut que le fichier ait une extension  que \n ZK Media Player ne peut lire ou possède un codec érroné");
})
   
    ipcMain.on("Image",(e,buffer)=>{
        var savePath = dialog.showSaveDialog(win,{
            title: "Enregistrer la capture",
            filters:[
                {name:"fichiers images", extensions:['png']}
            ],
        }).then((value)=>{
            fs.appendFile(value.filePath,buffer,(err,data)=>{

            })
        },(reason)=>{

        })
    })
var dirPicked;
    ipcMain.on("pickDir",()=>{
        dialog.showOpenDialog(Fwin,{
            title: "Selectionnez un dossier",
            properties: ["openDirectory"]
        }).then((value)=>{
            dirPicked = value.filePaths[0];
        })
    })

    ipcMain.on("arrURL",(e,arg)=>{
        for(var i=0;i<arg.length;i++){
            fs.appendFileSync(path.join(dirPicked,`image${i}.png`),Buffer.from(arg[i],"base64"));
        }
        console.log(arg);
        console.log(path.join(dirPicked,`image.png`))
        console.log("ok")
    })

  var sthmen =  Menu.buildFromTemplate([{
        label:"Enregistrer",
        click:()=>{
            if(!onrecording){
                onrecording = true
            win.webContents.send("record");
            }else{
                dialog.showErrorBox("Enregistrement en cours","Vous ne pouvez pas commencez d'enregistrement car un autre enregistrement est deja en cours")
            }
        }
    },
    {
        label:"Arreter l'enregistrement",
        click:()=>{
            if(onrecording){
                onrecording = false;
                win.webContents.send("stopRecord");
            }else{
                dialog.showErrorBox("","Aucun enregistrement en cours");
            }
        }
    }]);
    ipcMain.on("showRecordOpt",()=>{
        sthmen.popup();
    })
    
    var Vmenu = Menu.buildFromTemplate([
        {
            label:"basic",
            click:()=>{
                win.webContents.send("ChangeVtype","basic");
            }
        },
        {
            label:"vegas new year fiesta",
            click:()=>{
                win.webContents.send("ChangeVtype","vegas new year fiesta");
            }
        },
        {
            label:"sumfonja lotushi",
            click:()=>{
                win.webContents.send("ChangeVtype","sumfonja lotushi");
            }
        },
        {
            label:"targzan",
            click:()=>{
                win.webContents.send("ChangeVtype","targzan"); 
            }
        },
        {
            label:"tangent",
            click:()=>{
                win.webContents.send("ChangeVtype","tangent");
            }
        },
        {
            label:"ZK Oscilloscope",
            click:()=>{
                win.webContents.send("ChangeVtype","ZK Oscilloscope");
            }
        },
        {
            label:"wha",
            click:()=>{
                win.webContents.send("ChangeVtype","wha")
            }
        }
    ]);

    ipcMain.on("Vpopup",()=>{
        Vmenu.popup();
    })    
const menu = Menu.buildFromTemplate([
{
    /* Ce menu aura deux sous menu qui serviront a zoomer et a dezoomer*/
    label:'fenetre',
    submenu:[
        {
        label:'Zoom -',
        click: ()=>{
            const content = win.webContents;
            const level = content.getZoomLevel();
            content.setZoomLevel(level - 0.5);

        },
        accelerator:"CmdOrCtrl+M"
    },
    {
        label:'Zoom +',
        click: ()=>{
            const content = win.webContents;
            const level = content.getZoomLevel();
            content.setZoomLevel(level + 0.5);
        },
        accelerator:"CmdOrCtrl+P"
    },
    {
        label: "Plein écran",
        accelerator: "CmdOrCtrl+F",
        click:()=>{
            win.ZKFullScreen(!win.isFullScreen());
        }
    } 
]
},
{
    /*Ce menu donnera des informations quant a l'application et son createur*/
    label:"A propos ",
    click: ()=>{
        win.webContents.send("show-about");
    }
},
{
    /*Ce menu servira a manipuler certaines options de lecture comme 
    l'ouverture d'un fichier multimedia comme la creation et la suppression de la liste de lecture
    et meme l'ajout d'un media a la liste de lecture*/
    label:'Lecture',
    submenu:[
        {
            label:'Creer une liste de lecture',
            click:()=>{
               dialog.showOpenDialog(win,{ // on cree une boite de dialogue dans laquelle l'utilisateur choisira les fichiers qui constitueront la liste de lecture
                    title:'Select media source',
                    filters:[
                        {name: 'Fichiers mutimedia', extensions:['mp4','mp3','mkv','ogg','webm']}
                    ],
                    properties:['multiSelections']
                }).then((value)=>{
                   if(value.filePaths && value.filePaths.length !=0) win.webContents.send('create-reading-list',value.filePaths); // Si tout c'est bien passe , on envoie le tableau contenant les adresses des fichiers selectionnes
                },(reason)=>{
                    win.webContents.send('fail-to-create-reading-list'); // Si ca ne marche pas on le signale au processus de rendu
                })
            
            }
        },
        {
            label:'Ajouter un media a la liste de lecture',
            click:()=>{
                  dialog.showOpenDialog(win,{
                    title:'Select media source',
                    filters:[
                        {name: 'Fichiers mutimedia', extensions:['mp4','mp3','mkv','ogg','webm']}
                    ],
                    properties:['openFile']
                }).then((value)=>{
                 if(value.filePaths && value.filePaths.length!=0)  win.webContents.send('add-source',value.filePaths[0]);
                },(reason)=>{
                    win.webContents.send('fail-to-add-source');
                })
            }
        }
    ]
},
{
    label:'Media',
    submenu:[
        {
            label:'Charger une source media',
            click:()=>{
                var file =  dialog.showOpenDialog(win,{
                    title:'',
                    filters:[
                        {name: 'Fichiers mutimedia', extensions:['mp4','mp3','mkv','ogg','webm']}
                    ],
                    properties:['openFile']
                })
                file.then((value)=>{
                  if(value.filePaths && value.filePaths.length!=0)   win.webContents.send('set-source',value.filePaths[0]);
                },(reason)=>{
        
                }) 
            }
        },
        {
            label:"Enregistrer la video",
            click:()=>{
                if(!onrecording){
                    onrecording = true
                win.webContents.send("record");
                }else{
                    dialog.showErrorBox("Enregistrement en cours","Vous ne pouvez pas commencez d'enregistrement car un autre enregistrement est deja en cours")
                }
            }
        },
        {
            label:"Arreter l'enregistrement de la video",
            click:()=>{
                if(onrecording){
                    onrecording = false;
                    win.webContents.send("stopRecord");
                }else{
                    dialog.showErrorBox("","Aucun enregistrement en cours");
                }
            }
        }
    ]
},
{
    label: "Video",
    submenu:[{
        label: "Augmenter la vitesse de lecture",
        click: ()=>{
            win.webContents.send("speed++");
        },
        accelerator:"CmdOrCtrl+Q"
    },
    {
        label: "Diminuer la vitesse de lecture",
        click: ()=>{
            win.webContents.send("speed--");
        },
        accelerator: "CmdOrCtrl+L"
    },
    {
        type:"separator"
    },
    {
        label:"Capture",
        click:()=>{
            win.webContents.send("capture");
        }
    }]
},
{
    label: "Audio",
    submenu:[{
        label: "Visualisation audio",
        accelerator: "CmdOrCtrl+V",
        click:()=>{
win.webContents.send("visualise");
        }
    }]
},
{
    label: "Autre",
    submenu:[
{
    label: "Extraire les images d'une video",
    click: ()=>{
        Fwin = new BrowserWindow({
            title: "ZK FRAME EXTRACTOR",
            webPreferences:{
                preload: path.join(__dirname,"FrameExtractor.js"),
            }
        });
        Fwin.loadFile("FrameExtractor.html");
    }
},
{
    label: "Lire des fichiers midi",
    click:()=>{
    Mwin = new BrowserWindow({
            webPreferences:{
                preload:path.join(__dirname,"midi.js")
            }
    })
    Mwin.loadFile("midi-entire.html");
    }
}]
}
])
Menu.setApplicationMenu(menu);