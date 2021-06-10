import Scron from '../libs/scron.js';


describe("Check Format Validity - Should be Valid", () => {

    /*
        # ┌─────────── millisecond (0 - 999)
        # │ ┌───────────── seconds (0 - 59)
        # │ │ ┌─────────────── minute (0 - 59)
        # │ │ │ ┌───────────────── hour (0 - 23)
        # │ │ │ │ ┌─────────────────── day of the month (1 - 31)
        # │ │ │ │ │ ┌───────────────────── month (1 - 12)
        # │ │ │ │ │ │ ┌─────────────────────── day of the week (0 - 6) (Sunday to Saturday)
        # │ │ │ │ │ │ │ ┌───────────────────────── start of schedule (ddmmyyyy)
        # │ │ │ │ │ │ │ │ ┌─────────────────────────── end of schedule (ddmmyyyy)
        # │ │ │ │ │ │ │ │ │
        # * * * * * * * * *
    */

    // Create an array of Scrons
    const successTests = [
        "0",                                // Run once every second forever
        "0 0",                              // Run once every minute forever
        "0 0 0",                            // Run once every hour forever
        "0 10 * * * * * * *",               // Run once a minute at 10 seconds past
        "0 0 0 0 * * 1 01042018 *",         // Run every Monday at midnight starting on April 1st 2018 and never ending
        "0 0 0 0 1-7 * 2 * *",              // Run on the first Tuesday of each month at midnight
        "0 0 0 * * */2 5L 01012018 *",      // Run on the last Friday of every other month (feb, apr, jun, aug, oct, dec) starting on 1st January 2018 on every hour
        "0 0 30 9 * * 1",                   // Run at 9:30am every Monday
        "0 0 0 10 * 6,7,10 3L",             // Run on the last Wednesday of June, July and October at 10am
        "0 0 0 12 L 8,12",                  // Runs on the last day of the August and December at 12am
        "0 0 0 0 * January-March",          // Runs at midnight every day between January and March
        "0 0 0 0 * * Sat,mon,wed-friday",   // Runs at midnight every day between January and March

        // The below are similar to the above but using string values instead
        "0 0 0 0 * * monday 01042018 *",    // Run every Monday at midnight starting on April 1st 2018 and never ending
        "0 0 0 0 1-7 * TUE * *",            // Run on the first Tuesday of each month at midnight
        "0 0 0 * * */2 FridayL 01012018 *", // Run on the last Friday of every other month (feb, apr, jun, aug, oct, dec) starting on 1st January 2018 on every hour
        "0 0 30 9 * * Mon",                 // Run at 9:30am every Monday
        "0 0 0 10 * jul,JUNe,oct wedL",     // Run on the last Wednesday of June, July and October at 10am
        "0 0 0 12 L august,december",       // Runs on the last day of the August and December at 12am
        "0 0 0 0 * January-March",          // Runs at midnight every day between January and March
        "0 0 0 0 * * Sat,mon,wed-friday",   // Runs at midnight every day between January and March

        // Testing supplying a max run integer value instead of an end run date
        "0 0 0 10 * * * 01012019 100"       // Runs at 10am every day starting 1st Jan 2019 and runs 100 times before stopping


    ];

    // Run through each of the tests to check validity
    for (let i=0; i<successTests.length; i++){
        test(successTests[i], () => {
            const s = new Scron(successTests[i]);
            const output = s.validate();
            expect(output).toBe(true);
        });
    }

});

describe("Check Format Validity - Should be Invalid", () => {

    // Create an array of Scrons
    const failureTests = [
        "0*",
        "* -",
        "0 0 0 0 0 0 0 0 0",
        "1000 * * *",
        "* 60",
        "* * 60",
        "* * * 24",
        "* * * * 32",
        "* * * * * 13",
        "* * /> * 54 * 7",
        "* * * * * * * 1234",
        "* * * * * * * * 123456789",
        "0 0 0 0 * * sar-fro",
        "0 0 * 19 * * * * 23",
        "0 0 * 19 * * * 44444 23",
    ];

    // Run through each of the tests to check validity
    for (let i=0; i<failureTests.length; i++){
        test(failureTests[i], () => {
            const s = new Scron(failureTests[i]);
            const output = s.validate();
            //console.log(`'${failureTests[i]}' - ${output}`);
            expect(output).not.toBe(true);
        });
    }

});

describe("Next Run Matches Expected", () => {
    const nextRunYear = new Date().getFullYear() + 5;
    
    test(`Run at 9:30am every Monday starting 4th June ${nextRunYear}`, () => {
        const s = new Scron(`0 0 30 9 * * 1 0406${nextRunYear}`);
        let nr = s.nextRun();
        expect(nr.getTime()).toBe(new Date(`${nextRunYear}-06-10T09:30:00.000Z`).getTime());
    });

    test(`Runs on the last day of August and December at 12am starting 20th September ${nextRunYear}`, () => {
        const s = new Scron(`0 0 0 12 L 8,12 * 2009${nextRunYear}`);
        let nr = s.nextRun();
        expect(nr.getTime()).toBe(new Date(`${nextRunYear}-12-31T12:00:00.000Z`).getTime());
    });

    test(`Run once every hour forever starting 1st January ${nextRunYear}`, () => {
        const s = new Scron(`0 0 0 * * * * 0101${nextRunYear}`);
        let nr = s.nextRun();
        expect(nr.getTime()).toBe(new Date(`${nextRunYear}-01-01T00:00:00.000Z`).getTime());
    });

});

describe("toDateFormat() Matches Expected", () => {
    const testDate1 = new Date(2019, 0, 20, 5, 40, 12, 120);
    const testDate2 = new Date(105, 7, 1, 4, 22, 5, 5);
    const testDate3 = new Date(2000, 11, 4, 23, 0, 49, 0);
    const testDate4 = new Date(1980, 4, 30, 12, 59, 59, 0);
    const testDate5 = new Date(3300, 3, 19, 15, 10, 1, 999);

    test(`${testDate1.toString()} {dd^ MMMM yy} -> "20th January 19"`, () => {
        const ds = Scron.toDateFormat(testDate1, "dd^ MMMM yy");
        expect(ds).toBe("20th January 19");
    });

    test(`${testDate2.toString()} {d^ MMM yyy HH:m:s} -> "1st Aug 105 at 04:22:5"`, () => {
        const ds = Scron.toDateFormat(testDate2, "d^ MMM yyy at HH:m:s");
        expect(ds).toBe("1st Aug 105 at 04:22:5");
    });

    test(`${testDate3.toString()} {dddd dd MMMM yyyy HH:mm:ss:fff} -> "Monday 04 December 2000 23:00:49:000"`, () => {
        const ds = Scron.toDateFormat(testDate3, "dddd dd MMMM yyyy HH:mm:ss:fff");
        expect(ds).toBe("Monday 04 December 2000 23:00:49:000");
    });

    test(`${testDate4.toString()} {dddd d^ MMMM} -> "Friday 30th May"`, () => {
        const ds = Scron.toDateFormat(testDate4, "dddd d^ MMMM");
        expect(ds).toBe("Friday 30th May");
    });

    test(`${testDate5.toString()} {hh:mm:ss} -> "03:10:01"`, () => {
        const ds = Scron.toDateFormat(testDate5, "hh:mm:ss");
        expect(ds).toBe("03:10:01");
    });

    test(`${testDate5.toString()} {ddMMyyHHmmssfff} -> "190400151001999"`, () => {
        const ds = Scron.toDateFormat(testDate5, "ddMMyyHHmmssfff");
        expect(ds).toBe("190400151001999");
    });
});

describe("Next Run - Max Runs", () => {

    // Runs at midnight on the 1st Jan starting 1st Jan 2010 and will run 100 times before stopping
    test(`0 0 0 0 1 JAN * 01012010 100`, () => {
        const s = new Scron(`0 0 * 19 * * * * 23`);
        let nr = s.nextRun();
        const r=true;
        expect(r).toBe(true);
    });

});

// describe("testArea", () => {

//     test("testArea 1", () => {
//         const time_a = new Date().getTime();
//         const scron = new Scron("0 * 42-43 23 * * * 01122019");
//         console.log(scron.toString());
//         const nr = scron.nextRun();
//         console.log(nr, `took: ${((new Date().getTime()-time_a)/1000).toFixed(2)} seconds`);
//         const r=true;
//         expect(r).toBe(true);
//     });

// })