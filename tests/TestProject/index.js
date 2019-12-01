import Scron from '@twin3/scron';

const scron = new Scron("0 * 42-43 23 * * * 01122019");
scron.run({
    callback:({ state, run, error }) => {
        switch(state){
            case scron.RunStates.Error:
                
                // Errored
                console.log("Run into an error - had to stop");
                error && console.log(error);
                break;

            case scron.RunStates.Finished:

                // Finished running this Scron
                console.log("No more run times are available with this scron. If you need it to run forever try not specifying an end date or max run amount!");
                break;

            default:
                
                // Otherwise we'll be running (Scron.RunStates.Running)
                console.log(">> This is where our run code would go...", `Time is: ${Scron.toDateFormat(new Date(), "dddd dd MMMM yyyy HH:mm:ss:fff")}`);
                    
                // When we're done - we can recall the run process. Depending how long we take in this function
                // and depending on how our Scron is setup we may skip a run or 2 if we're running syncronously
                // (if we're running asynchronously then the run() will be null so won't be called)
                !!run && run();
                

        }
    },
    synchronous:false,
    //startDate:new Date().getTime()+5000
})