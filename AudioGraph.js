window.addEventListener("DOMContentLoaded",()=>{
    var e=require("electron").ipcRenderer;
    s=document.querySelector("canvas");
    v=s.getContext("2d");
    e.on("erase",()=>{
        v.clearRect(0,0,s.width,s.height)});
        e.on("draw",(e,t,r,a,n,o)=>{
            for(var d=t,i=a,l=0,c=o,h=0;h<d;h++)l=1.5*c[h];
            v.save(),v.translate(s.width/2,s.height/2);
            v.rotate(h*Math.PI*10/d);
            v.fillStyle=`hsl(${.3*h},100%,${l/3}%)`;
            v.fillRect(0,0,i,l);
            v.restore()
        })
    });