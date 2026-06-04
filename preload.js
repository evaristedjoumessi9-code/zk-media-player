window.addEventListener("DOMContentLoaded",()=>{
    let {ipcRenderer}=require("electron");
    var player=document.querySelector("#video");
    var ElapsedTime=document.querySelector("#ElapsedTime");
    var duree=document.querySelector("#duree");
    var mode_setter=document.querySelector("#mode");
    var next=document.querySelector("#next");
    var previous=document.querySelector("#previous");
    let stream,mediaRecorder,recordWidget=document.querySelector("#fakebox");
    ipcRenderer.send("spawn");
    var Modes=[{type:"continue",src:"continue.png"},{type:"loop",src:"loop.png"}];
    var mode=Modes[0].type;
    var mode_I=0;
    var playbackRateShower=document.querySelector("#PlaybackRate-shower");
    var reading_list=null;
    var index=0;
    var captureFrame=document.createElement("canvas");
    var FrameContext=captureFrame.getContext("2d");
    function verif(filePath){
        filePath=filePath.split(".");
        return filePath=filePath[filePath.length-1].toLowerCase(),-1!=["mp4","mkv","mpeg4","mp3","webm"].indexOf(filePath)&&!0
    }
    player.addEventListener("dblclick",()=>{
        ipcRenderer.send("fullscreen")
    });
    ipcRenderer.on("send",(e,arg)=>{
        reading_list?reading_list.push(arg):(player.src=arg,ipcRenderer.send("win-name",arg))
    });
    ipcRenderer.on("show-about",()=>{
        window.open("About.html","","height=672,width=559")
    });
    ipcRenderer.on("create-reading-list",(e,arg)=>{
        reading_list=[];
        for(var i=0;i<arg.length;i++){
            reading_list.push(arg[i])
        }
        player.src=reading_list[0];
        ipcRenderer.send("win-name",reading_list[index])
    });
    ipcRenderer.on("add-source",(e,arg)=>{
        if(!reading_list){
            reading_list=[];
            reading_list.push(arg);
            if(verif(arg)){
                player.src=reading_list[0];
            }else{
                reading_list.pop();
                ipcRenderer.send("Unreadable-file")
            }
        }else{
            if(verif(arg)){
                reading_list.push(arg);
                ipcRenderer.send("Unreadable-file");
            }
        }
    });
    ipcRenderer.on("set-source",(e,arg)=>{
        if(verif(arg)){
            player.src=arg;
            ipcRenderer.send("win-name",arg);
        }else{
            ipcRenderer.send("Unreadable-file")
        }
    });
    ipcRenderer.on("fail-to-create-reading-list",()=>{
        alert("Desole, nous n'avons pas creer une liste de lecture a partir des fichiers selectionne")
    });
    ipcRenderer.on("fail-to-add-source",()=>{
        alert("Desole nous n'avons pas pu ajouter le fichier selectonner a la liste de lecture. \n Veuillez reessayer")
    });
    ipcRenderer.on("speed++",()=>{
        player.playbackRate+=.25
    });
    ipcRenderer.on("speed--",()=>{
        .25<player.playbackRate&&(player.playbackRate-=.25)
    });
    window.addEventListener("resize",()=>{
        playbackRateShower.style.left=getComputedStyle(document.body,null).width-50
    });
    player.addEventListener("ratechange",e=>{
        var speed=100*player.playbackRate;
        playbackRateShower.textContent="Vitesse de lecture :"+speed+"%";
        playbackRateShower.style.display="inline-block";
        setTimeout(()=>{
            playbackRateShower.style.display="none"
        },3e3)
    });
        document.addEventListener("dragover",e=>{
            e.preventDefault(),e.stopPropagation()
        });
        document.addEventListener("drop",e=>{
            e.preventDefault();
            e.stopPropagation();
            e=e.dataTransfer.files;
            verif(e[0].path)&&(player.src=e[0].path,ipcRenderer.send("win-name",e[0].path))
        });
        next.addEventListener("click",()=>{
            if(player.src!=""){
                switch (mode){
                    case "list_loop":
                        reading_list[index+1]?index++:index=0;
                        player.src=reading_list[index];
                        ipcRenderer.send("win-name",reading_list[index]);
                        break;
                    
                    case "loop":
                        player.currentTime=0;
                        break;
                    
                    case "continue":
                        if(reading_list[index+1]){
                            index++;
                            player.src=reading_list[index];
                            ipcRenderer.send("win-name",reading_list[index]);
                        }else{
                            player.pause();
                            player.currentTime = 0;
                            player.src="";
                            slide.style.width="0px"
                        }
                }
            }
            player.currentTime=0;
        });
        previous.addEventListener("click",()=>{
            if(player.src!=""){
                        reading_list[index-1]?index--:index=reading_list.length-1;
                        player.src=reading_list[index];
                        ipcRenderer.send("win-name",reading_list[index]);
                        player.currentTime=0;       
            }
        });
        var bufferLength,dataArray,Annex,canvas,ctx,changeType;
        var next=new AudioContext;
        var previous=next.createMediaElementSource(player);
        var analyser=next.createAnalyser();
        var previous=(previous.connect(analyser),next.createGain());
        var barWidth=(analyser.connect(previous),previous.connect(next.destination),analyser.fftSize=2048,15);
        ipcRenderer.on("visualise",()=>{
            Annex||((Annex=window.open("AudioGraph.html")).onload=()=>{
                changeType=Annex.document.querySelector("#change_button");
                canvas=Annex.document.querySelector("#canvas");
                ctx=canvas.getContext("2d");
                changeType.addEventListener("click",e=>{ipcRenderer.send("Vpopup")});
                animate();
            })
            });
                ipcRenderer.on("close-Annex",()=>{Annex=null})
        visualiserTemplates=({
            basic:(length,abs,width,height,array)=>{
                analyser.fftSize=1024;
                ctx.shadowBlur=0;
                ctx.shadowColor="black";
                ctx.globalCompositeOperation="source-over";
                for(var i=0;i<length;i++){
                    height=1.5*array[i];
                    ctx.save();
                    ctx.translate(abs,canvas.height);
                    ctx.rotate(Math.PI);
                    ctx.translate(canvas.width,0);
                    var hue=.3*i;
                    linear=ctx.createLinearGradient(0,0,width,height);
                    linear.addColorStop(0,`rgb(${hue},100,${height/3})`);
                    linear.addColorStop(1,"teal");
                    ctx.fillStyle=linear;
                    ctx.fillRect(0,0,width,height);
                    abs+=width;
                    ctx.restore()
                }
            },
            "sumfonja lotushi":(length,abs,width,height,array)=>{
                analyser.fftSize=1024;
                ctx.shadowBlur=0;
                ctx.shadowOffsetX=0;
                ctx.shadowOffsetY=0;
                ctx.globalCompositeOperation="source-over";
                ctx.shadowColor="black";
                for(var i=0;i<length;i++){
                    height=1.5*array[i];
                    ctx.save();
                    ctx.translate(canvas.width/2,canvas.height/2);
                    ctx.rotate(i*Math.PI*10/length);
                    ctx.fillStyle=`hsl(${.3*i},100%,${height/3}%)`;
                    ctx.fillRect(0,0,width,height);
                    ctx.restore()
                }
                },
            "vegas new year fiesta":(length,abs,width,height,array)=>{
                analyser.fftSize=128;
                ctx.shadowOffsetX=0;
                ctx.shadowOffsetY=0;
                ctx.shadowBlur=20;
                ctx.shadowColor="gold";
                ctx.lineCap="round";
                ctx.globalCompositeOperation="xor";
                for(var i=0;i<length;i++)height=1.2*array[i],ctx.save(),ctx.translate(canvas.width/2,canvas.height/2),ctx.rotate(i*length/1.2),ctx.lineWidth=height/7,ctx.strokeStyle=`hsl(${200+5*i},100%,50%)`,ctx.beginPath(),ctx.moveTo(0,height/1.1),ctx.lineTo(height/1.1,height),ctx.stroke(),ctx.restore()
                },
            targzan:(length,abs,width,height,array)=>{
                analyser.fftSize=1024,ctx.shadowBlur=0,ctx.shadowOffsetX=0,ctx.shadowOffsetY=0,ctx.globalCompositeOperation="source-over",ctx.shadowColor="black";
                for(var i=0;i<length;i++){
                    height=1.5*array[i],ctx.save(),ctx.translate(canvas.width/2,canvas.height/2);var hue=250+2*i;ctx.lineWidth=5,ctx.strokeStyle=`hsl(${hue},100%,50%)`,ctx.beginPath(),ctx.arc(0,0,height/5,0,2*Math.PI),ctx.stroke(),ctx.restore()
                }
            },
            tangent:(length,abs,width,height,array)=>{
                analyser.fftSize=1024;
                ctx.shadowBlur=0;
                ctx.shadowOffsetX=0;
                ctx.shadowOffsetY=0;
                ctx.globalCompositeOperation="source-over";
                ctx.shadowColor="black";
                for(var i=height=0;i<length;i++)i%6==0&&(height+=1.5*array[i],ctx.save(),ctx.translate(canvas.width/2,canvas.height-height/25),ctx.strokeStyle=`hsl(${250+2*i},100%,50%)`,ctx.beginPath(),ctx.arc(0,0,height/25,0,2*Math.PI),ctx.stroke(),ctx.restore())
                },
            "ZK Oscilloscope":(length,abs,width,height,array)=>{
                analyser.fftSize=4096;
                ctx.shadowBlur=0;
                ctx.shadowOffsetX=0;
                ctx.shadowOffsetY=0;
                ctx.globalCompositeOperation="source-over";
                ctx.shadowColor="black";
                ctx.strokeStyle="red";
                ctx.beginPath();
                for(var i=0;i<length;i++){
                    height=1.5*array[i]*Math.pow(-1,i)/1.1;
                    ctx.save();
                    ctx.translate(5,canvas.height/2);
                    0==i?ctx.moveTo(abs,-height/1.5):ctx.lineTo(abs,-height/1.5);
                    i==length-1&&ctx.stroke();
                    abs+=width;
                    ctx.restore();
                }
            },
            "wha":(length,abs,width,height,array)=>{
                analyser.fftSize=1024;
                ctx.shadowBlur=0;
                ctx.shadowOffsetX=0;
                ctx.shadowOffsetY=0;
                ctx.globalCompositeOperation="source-over";
                ctx.shadowColor="black";
                for(var i=0;i<length;i++){
                    ctx.fillStyle="grey";
                    height=1.5*array[i];
                    ctx.save();
                    ctx.translate(abs,canvas.height/2);
                    ctx.fillRect(0,-height/2,width-5,height);
                    ctx.beginPath()
                    ctx.arc(5,(height/2),5,0,Math.PI);
                    ctx.fill();
                    ctx.beginPath()
                    ctx.arc(5,(-height/2),5,Math.PI,2*Math.PI);
                    ctx.fill();
                    abs+=width;
                    ctx.restore()
                }
            }
        });
        var Vtype="sumfonja lotushi";
        ipcRenderer.on("ChangeVtype",(e,arg)=>{barWidth="ZK Oscilloscope"==(Vtype=arg)?4:15})
        const animate=()=>{
            bufferLength=analyser.frequencyBinCount;
            dataArray=new Uint8Array(bufferLength);
            ctx.clearRect(0,0,canvas.width,canvas.height);
            analyser.getByteFrequencyData(dataArray);
            visualiserTemplates[Vtype](bufferLength,0,barWidth,void 0,dataArray);
            Annex.requestAnimationFrame(animate)
        };
        ipcRenderer.on("capture",()=>{
            player.pause();
            captureFrame.width=parseFloat(getComputedStyle(player,null).width.split("px")[0]);
            captureFrame.height=parseFloat(getComputedStyle(player,null).height.split("px")[0]);
            FrameContext.drawImage(player,0,0,parseFloat(getComputedStyle(player,null).width.split("px")[0]),parseFloat(getComputedStyle(player,null).height.split("px")[0]));
            var data=captureFrame.toDataURL();
            var data=Buffer.from(data.split(",")[1],"base64");
            ipcRenderer.send("Image",data)
        });
        player.addEventListener("mousedown",e=>{
            2===e.button&&ipcRenderer.send("showRecordOpt")
        });
        ipcRenderer.on("record",()=>{
            if(verif(player.src)){
                recordWidget.style.display="flex";
                stream=player.captureStream();
                mediaRecorder=new MediaRecorder(stream,{mimeType:"video/webm"})
                mediaRecorder.ondataavailable=e=>{
                var url=URL.createObjectURL(e.data);
                var a=document.createElement("a");
                a.href=url
                var ext=player.src.split(".");
                a.download="extrait."+ext[ext.length-1].toLowerCase();
                a.click()
            }
            mediaRecorder.start()
        }else{
                alert("Aucune lecture en cours");
            }
        });
        ipcRenderer.on("stopRecord",()=>{
            mediaRecorder.stop();
            recordWidget.style.display="none"
        });
        mode_setter.addEventListener("click",()=>{
            reading_list&&Modes.length<3&&Modes.push({type:"list_loop",src:"mode(list-loop).png"});
            Modes[mode_I+1]?mode_I++:mode_I=0;
            mode=Modes[mode_I].type;
            mode_setter.src=Modes[mode_I].src
        });
        player.addEventListener("ended",()=>{
            switch(duree.textContent="--:--",ElapsedTime.textContent="--:--",mode){
                case"loop":
                player.currentTime=0;
                player.play();
                break;
                case"continue":
                reading_list?reading_list[index+1]?(index++,player.src=reading_list[index],ipcRenderer.send("win-name",reading_list[index])):ipcRenderer.send("reset-name"):(duree.textContent="--:--",ElapsedTime.textContent="--:--",player.currentTime=0,player.src="",console.log(player.src),ipcRenderer.send("reset-name"));
                break;
                case"list_loop":reading_list[index+1]?index++:index=0,player.src=reading_list[index],ipcRenderer.send("win-name",reading_list[index])
            }
            })
    });