 var timeProcesswasrunning = process.uptime();
 var currentTime =  new Date().getTime()/1000;
 
console.log("time process was running: ",timeProcesswasrunning)
console.log("current time: ",currentTime)

setTimeout(function(){
   
   var tempTime = process.uptime();
   var endTime =  new Date().getTime()/1000;
   
   console.log("time process was running: ",tempTime)
   console.log("current time: ",endTime)
   
   console.log("Diff in uptime: ",(tempTime-timeProcesswasrunning));
   console.log("Diff in system time: ",(endTime-currentTime));
 
}, 5 * 1000);