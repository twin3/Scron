/*

    Written by N.Palethorpe at Twin3 Ltd UK
    Development started November 2019 and is ongoing.
    Scron uses the MIT Licence.

    This lib is produced and maintained by Twin3
    https://twin3.co.uk

    The home of this library is on the Twin3 GitHub.
    https://github.com/twin3/Scron

    Scron is a lightweight JS library built to provide scheduling functionality. Scron
    is built on the format concept of the old Cron system built into the UNIX OS but 
    improved in a multitude of different ways in order to make it more efficient for
    web/JS-based usage. 

    On a personal note, as a web developer I always hated clients asking me to add in calenders
    and text fields in order to capture some recurring date value, in the most part it was always a
    hassel due to having to support different browsers, nor did I ever like using third 
    party 'solutions' due to them (in the most part) being overly bloated. Scron was a
    child of this hatred and I believe there are many other individuals that this lib
    can help out. Yes it requires a little learning curve but I don't believe it's difficult
    to grasp...I guess time will tell!

    There is a Wiki to help better explain all of the following functions and
    a guide that is available to send to end-users in order to explain how to
    write a Scron formula, this can be found at: https://github.com/twin3/Scron/wiki

*/
class Scron {
    
    // Create a new Scron
    constructor(formatString){
        this.MAX_SETINTERVAL_VALUE = 2147483647;
        this.MONTHS = [
            ["January","Jan"],
            ["February","Feb"],
            ["March","Mar"],
            ["April","Apr"],
            ["May","May"],
            ["June","Jun"],
            ["July","Jul"],
            ["August","Aug"],
            ["September","Sep"],
            ["October","Oct"],
            ["November","Nov"],
            ["December","Dec"]
        ];
        this.DAYS = [
            ["Sunday","Sun"],
            ["Monday","Mon"],
            ["Tuesday","Tue"],
            ["Wednesday","Wed"],
            ["Thursday","Thu"],
            ["Friday","Fri"],
            ["Saturday","Sat"]
        ];
        this.KEY = {
            ms:"MS",    // Milliseconds
            s:"SE",     // Seconds
            m:"MI",     // Minutes
            h:"HO",     // Hours
            dom:"DM",   // Day of the Month
            mo:"MO",    // Month
            dow:"DW",   // Day of the Week
            st:"ST",    // Start Time
            en:"ET",    // End Time
            mr:"MR"     // Max Runs
        }
        
        // States to express where we're at when you decide to use the run() functionality
        // This state is returned on each callback so we know if we can re-call again.
        this.RunStates = {
            Running:1,
            Finished:2,
            Error:3,
        }

        this.update(formatString || "");
    }   

    // Convert a date string in the format of ddmmyyyy into an actual date
    // object which we can use
    dateStringToDate(dateString){
        try {
            if (!!dateString && dateString.length===8){
                const day = Number(dateString.substring(0,2));
                const month = Number(dateString.substring(2,4))-1;
                const year = Number(dateString.substring(4));
                return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
            } else {
                return null;
            }
        } catch(e){
            console.log(e);
            return null;
        }
    }


    // Generate an array of integers based on a range string
    // in the format of "3-21"
    getIntRange(rangeString){
        let output = [];
        let val1 = 0;
        let val2 = 0;
        let rangeSplit = rangeString.split("-");
        if (rangeSplit.length===2 && !isNaN(rangeSplit[0]) && !isNaN(rangeSplit[1])){
            val1 = Number(rangeSplit[0]);
            val2 = Number(rangeSplit[1]);
            for(let i=Math.min(val1, val2); i<=Math.max(val1, val2); i++){
                output.push(i);
            }
        }
        return output;
    }


    // Join an array of strings together with the last words being
    // joined by a given word or "and" by default. so [one, two three] would result
    // in an output string of "one, two and three".
    concatenateStringList(strings, endJoinWord){
        let result = ``;
        for(let i=0; i<strings.length; i++){
            if (i===0){
                result += strings[i];
            } else if (i===strings.length-1){
                result += ` ${endJoinWord || "and"} ${strings[i]}`;
            } else {
                result += `, ${strings[i]}`;
            }
        }
        return result;
    }


    // Get the nth term for the given integer
    // so 1 would output "st", 27 would output "th"
    // nthAllIntsInString runs through a full string of words and finds
    // all numerical instances and automatically appends in the nth 
    // terms throughout the string.
    nth(d){
        if (d > 3 && d < 21) return 'th'; 
        switch (d % 10) {
            case 1:  return "st";
            case 2:  return "nd";
            case 3:  return "rd";
            default: return "th";
        }
    }
    nthAllIntsInString(string){
        let result = "";
        let numberStr = "";
        for(let c=0; c<string.length; c++){
            const char = string.charAt(c);
            const nextChar = string.charAt(c+1);
            if ('0123456789'.indexOf(char) !== -1){
                numberStr += char;
            }
            result += char;
            if (numberStr.length > 0 && (!nextChar || '0123456789'.indexOf(nextChar) === -1)){
                result += this.nth(Number(numberStr));
                numberStr = "";
            }
        }
        return result;
    }

    // Add in commas every 3 digits for displaying
    numberWithCommas(number) {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    
    // Accept an array of integers and output an array of strings which
    // combine the numbers into ranges. For instance passing in an array of
    // [ 1, 3, 4, 5, 9, 13, 14, 15, 16, 17, 26] would result in an array of
    // [ "1", "3 -> 5", "9", "13 -> 17", "26"] being produced.
    intArrayToRangeStrings(intArr, unitString){
        let ranges = [];
        let currentRange = [];
        let lastIncrement = null;

        // First lets order the array
        intArr = intArr.sort((a, b) => a - b);

        // Now check for ranges
        for(let i=0; i<intArr.length; i++){
            currentRange.push(intArr[i]);
            let nextIncrement = intArr[i+1]?intArr[i+1]-intArr[i]:-1;
            if (nextIncrement===-1 || (!!lastIncrement && nextIncrement!==lastIncrement)){

                // This range has ended
                if (currentRange.length>3){

                    // Check the increment value
                    if (lastIncrement>1){
                        ranges.push(`every ${lastIncrement} ${unitString?unitString+" ":""}between and including the ${currentRange[0]} and ${currentRange[currentRange.length-1]}`)
                    } else {
                        ranges.push(`the ${currentRange[0]} -> ${currentRange[currentRange.length-1]}${i<intArr.length-1&&unitString?" "+unitString:""}`);
                    }

                } else {
                    for(let r=0; r<currentRange.length; r++){
                        ranges.push(`${currentRange[r]}`);
                    }
                }

                // Clear the range
                currentRange = [];

            }

            // Keep a record of this increment
            lastIncrement=nextIncrement;

        }
        
        return ranges;
    }


    // Accepts a range string in the format of "3-21" and outputs an array
    // of integers within the range (including the min and max value specified)
    getRange(rangeString, defaultOutput){
        let output = [];
        try {

            // Check we have a valid range
            if (rangeString){
                    
                // Split each range on commas in order to allow multiple of range types to really
                // specific the exact outcome you're after
                for (let i=0; i<rangeString.split(",").length; i++){
                    const rng = rangeString.split(",")[i];
                    let additions = [];

                    // Check the range string and see how we need to process
                    // it and grab out our possible values
                    if (!rng || rng === "*" || rng==="L"){

                        // * means any - due to the vast nature of 'any' we'll need
                        // to rely on an array of values passed through to us.
                        additions = defaultOutput || [];

                    } else if (rng.indexOf("-") > -1){

                        // Includes a range of values
                        additions = this.getIntRange(rng);

                    } else if (new RegExp("^[*]?\/([1-9][0-9]{0,2})$").test(rng)){

                        // Includes a step value - base this on our max default output value
                        let stepAmount = rng.indexOf("*/") > -1 ? Number(rng.substring(2)) : Number(rng.substring(1));
                        let stepMaxVal = 0;
                        let currStep = 0;
                        for (let i=0; i<defaultOutput.length; i++){
                            if (defaultOutput[i] > stepMaxVal){
                                stepMaxVal = defaultOutput[i];
                            }
                        }
                        while(currStep<=stepMaxVal){
                            if (currStep<=stepMaxVal){
                                additions.push(currStep);
                            }
                            currStep += stepAmount;
                        }

                    } else if (rng.endsWith("L")){

                        // Includes a 'Last of' - we should also have a value before the L
                        additions.push(Number(rng.slice(0, -1)));

                    } else {

                        // Should be just a number (in string format)
                        additions.push(Number(rng));

                    }

                    // Run through our additions and only add in what we haven't already
                    // got in the collection
                    for(let i=0; i<additions.length; i++){
                        if (output.indexOf(additions[i])===-1){
                            output.push(additions[i]);
                        }
                    }
                
                }

            } else {
                output = defaultOutput || [];
            }
            
        } catch(e){
            //console.log(e);
        }
        return output;
    }

    
    // Output a date string in the requested format using the passed in date, the format
    // follows the format rules:
    static toDateFormat(date, formatString){
        const s = new Scron();
        
        // Make sure the date is a date object - this also allows us to use ticks
        const _date = new Date(date);
        
        // Allowed formats and their date values
        const allowedFormats = {
            "dddd": s.DAYS[_date.getUTCDay()][0],
            "ddd": s.DAYS[_date.getUTCDay()][0].substring(0,3),
            "dd": ("0"+_date.getDate()).slice(-2),
            "d": _date.getDate().toString(),
            "MMMM": s.MONTHS[_date.getMonth()][0],
            "MMM": s.MONTHS[_date.getMonth()][0].substring(0,3),
            "MM": ("0"+(_date.getMonth() + 1)).slice(-2),
            "M": (_date.getMonth() + 1).toString(),
            "yyyy": _date.getFullYear().toString(),
            "yyy": _date.getFullYear().toString().startsWith("0") || _date.getFullYear().toString().length===3 ? _date.getFullYear().toString().slice(-3) : _date.getFullYear().toString(),
            "yy": _date.getFullYear().toString().slice(-2),
            "y": _date.getFullYear().toString().slice(-2).startsWith("0") ? _date.getFullYear().toString().slice(-1) : _date.getFullYear().toString().slice(-2),
            "HH": ("0"+_date.getHours()).slice(-2),
            "H": _date.getHours().toString(),
            "hh": ("0"+(_date.getHours()%12 === 0 ? 12 : _date.getHours()%12)).slice(-2),
            "h": _date.getHours()%12 === 0 ? 12 : _date.getHours()%12,
            "mm": ("0"+(_date.getMinutes().toString())).slice(-2),
            "m": _date.getMinutes().toString(),
            "ss": ("0"+(_date.getSeconds().toString())).slice(-2),
            "s": _date.getSeconds().toString(),
            "fff": ("000"+_date.getMilliseconds()).slice(-3),
            "ff": _date.getMilliseconds()>99 ? _date.getMilliseconds().toString() : ("000"+_date.getMilliseconds()).slice(-2),
            "f": _date.getMilliseconds()
        }
        
        // Loop through each char of the format string and break it up into sections of chars
        let section = "";
        let splitFormat = [];
        for (let i=0; i<formatString.length; i++){
            const c = formatString.charAt(i);
            const nc = formatString.charAt(i+1);
            
            // Add onto the current section
            section += c;

            // Check if the next char is the same
            if (nc!==c||section.length>=4){

                // This section has ended so lets push it into the collection
                splitFormat.push(section);

                // Remember to clear the section for the next run
                section = "";

            }

        }

        // Run through each split format and individually replace with the relevant format
        // We run backwards to allow us to slice out records we don't need
        let nthNextValue = false;
        for (let i=splitFormat.length; i>=0; i--){
            const thisFormatStr = splitFormat[i];

            // Check if the current value is a ^ - this means we need to add a nth value
            if (thisFormatStr==="^"){

                // Set a flag to show we need to nth the next value
                nthNextValue = true;

                // Remove this value from the arry
                splitFormat.splice(i, 1);

            } else if (allowedFormats.hasOwnProperty(thisFormatStr)) {

                // Replace the value with the formated date value
                splitFormat[i] = allowedFormats[thisFormatStr];

                // Check if we needed to nth this value
                if (nthNextValue){

                    // Add the nth value
                    splitFormat[i] = s.nthAllIntsInString(splitFormat[i]);

                    // Reset the nthNextValue flag
                    nthNextValue = false;

                }

            }

        }

        // Join the split format back together and return it
        return splitFormat.join("");
    }


    // Update the Scron format string
    update(formatString){
        this.formatString = formatString;

        // Add in our default params
        this.params = {};
        this.params[this.KEY.ms] = { index:0, original:"", default:[], value:[], strRange:"0-999", type:'range' };
        this.params[this.KEY.s] = { index:1, original:"", default:[], value:[], strRange:"0-59", type:'range' };
        this.params[this.KEY.m] = { index:2, original:"", default:[], value:[], strRange:"0-59", type:'range' };
        this.params[this.KEY.h] = { index:3, original:"", default:[], value:[], strRange:"0-23", type:'range' };
        this.params[this.KEY.dom] = { index:4, original:"", default:[], value:[], strRange:"1-31", type:'range' };
        this.params[this.KEY.mo] = { index:5, original:"", default:[], value:[], strRange:"1-12", type:'range' };
        this.params[this.KEY.dow] = { index:6, original:"", default:[], value:[], strRange:"0-6", type:'range' };
        this.params[this.KEY.st] = { index:7, original:"", default:null, value:null, type:'date' };
        this.params[this.KEY.en] = { index:8, original:"", default:null, value:null, type:'date' };
        this.params[this.KEY.mr] = { index:8, original:"", default:null, value:null, type:'int' };
        
        // Replace all iterations of string values for the months
        for(let i=0; i<this.MONTHS.length; i++){
            for(let m=0; m<this.MONTHS[i].length; m++){
                formatString = formatString.replace(new RegExp(`${this.MONTHS[i][m]}`, 'gi'), i);
            }
        }

        // Replace all iterations of string values for the weeks
        for(let i=0; i<this.DAYS.length; i++){
            for(let d=0; d<this.DAYS[i].length; d++){
                formatString = formatString.replace(new RegExp(`${this.DAYS[i][d]}`, 'gi'), i);
            }
        }
        
        // Split the format string and push it into an object we can utilise
        this.formatSplit = formatString.split(" ");
        for(let key in this.params){
            this.params[key].original = this.formatSplit[this.params[key].index] || null;
            switch(this.params[key].type){
                case 'range':
                    this.params[key].default = this.getIntRange(this.params[key].strRange);
                    this.params[key].value = this.getRange(this.formatSplit[this.params[key].index], this.params[key].default);
                    break;
                case 'date':
                    this.params[key].value = this.dateStringToDate(this.formatSplit[this.params[key].index]);
                    break;
                case 'int':
                    this.params[key].value = !isNaN(this.formatSplit[this.params[key].index]) ? Number(this.formatSplit[this.params[key].index]) : null;
                    break;
                default:
                    // No known type on this param?
            }
        }

        // We can't have both end date and max run but its difficult to limit it up there ^^ so lets check to see if we
        // have an end date as that one is easier to determine, if we do then we'll set maxrun to null
        if (!!this.params[this.KEY.en].value){
            this.params[this.KEY.mr].value = null;
        }

        // Run the validate now
        this.validateResult = this.validate();
    }


    // Generate a friendly string to explain the Scron format
    toString(){
        let result = "";
        let skip = false;
        let startPhrase = "";
        
        // Check the validation result first
        if (this.validateResult!==true){

            // Invalid Scron - return the validation error instead
            result = this.validateResult;

        } else if (this.formatString.trim()===""){

            // No scron entered
            result = "No Scron entered";

        } else {

            /*

                Runs every month on the 2nd between the 5th and the 9th, 12th, 15th, 16th, 19th or the 20th -> 24th, on the 18th -> 20th hour 
                and 23rd hour, on 8th, 10th, 11th, 14th and the 15th -> 18th minute, on 13th second and on the the 12th -> 345th millisecond, 
                until the end of time.

                Runs on the 2nd, between the the 5th and 9th, 12th, 15th, 16th, 19th and the 20th -> 24th of every month, on the 18th -> 20th
                hour and 23rd hour, on the 8th, 10th, 11th, 14th and the 15th -> 18th minute, on the 13th second and on the 12th -> 345th millisecond
                until the end of time.

                Runs every month on the 2nd, 

            */

            // Check what params the user specified
            const spec_milliseconds = this.params[this.KEY.ms];
            const spec_seconds = this.params[this.KEY.s];
            const spec_minutes = this.params[this.KEY.m];
            const spec_hours = this.params[this.KEY.h];
            const spec_dayofmonth = this.params[this.KEY.dom];
            const spec_month = this.params[this.KEY.mo];
            const spec_dayofweek = this.params[this.KEY.dow];
            const spec_start = this.params[this.KEY.st];
            const spec_end = this.params[this.KEY.en];
            const spec_maxruns = this.params[this.KEY.mr];

            // Handle the start date sentance
            if (!!spec_start.value){
                startPhrase = `Runs from ${Scron.toDateFormat(spec_start.value, "dddd d^ MMMM yyyy")}`;
            } else {
                startPhrase = `Runs`;
            }

            // Set the start phrase
            result += startPhrase;

            // Handle some general terms
            if (spec_milliseconds.value.length===spec_milliseconds.default.length && spec_seconds.value.length===spec_seconds.default.length &&
                spec_minutes.value.length===spec_minutes.default.length && spec_hours.value.length===spec_hours.default.length &&
                spec_dayofmonth.value.length===spec_dayofmonth.default.length && spec_month.value.length===spec_month.default.length &&
                spec_dayofweek.value.length===spec_dayofweek.default.length){

                // Everything is all *'d up
                result += " every millisecond";

            } else if (spec_milliseconds.value.length===1 && spec_seconds.value.length===spec_seconds.default.length &&
                spec_minutes.value.length===spec_minutes.default.length && spec_hours.value.length===spec_hours.default.length &&
                spec_dayofmonth.value.length===spec_dayofmonth.default.length && spec_month.value.length===spec_month.default.length &&
                spec_dayofweek.value.length===spec_dayofweek.default.length){ 

                // Milliseconds are precise - everything else is 'run whenever'
                if (spec_milliseconds.value[0]===0){
                    result += ` once every second, precisely on the second`;
                } else {
                    result += ` once every second at the ${spec_milliseconds.value[0]}${this.nth(spec_milliseconds.value[0])} millisecond`;
                }

            } else {

                // Handle the month sentance
                if (spec_month.value.length===spec_month.default.length){
                    result += ""; //" every month";
                } else {
                    result += " ";
                    if (spec_month.value.length===1){
                        result += `every ${this.MONTHS[spec_month.value[0]-1][0]}`;
                    } else {
                        let monthNames = spec_month.value.map((item, index, arr) => {
                            return this.MONTHS[item-1][0];
                        })
                        result += `every ${this.concatenateStringList(monthNames)}`;
                    }
                }

                // Handle the weeks sentance
                if (spec_dayofweek.value.length!==spec_dayofweek.default.length){
                    result += " ";
                    if (spec_dayofweek.value.length===1){
                        if (spec_dayofweek.original.indexOf("L") > -1){
                            result += `on the last ${this.DAYS[spec_dayofweek.value[0]][0]} of the month`;
                        } else if (spec_month.value.length===spec_month.default.length){
                            result += `every ${this.DAYS[spec_dayofweek.value[0]][0]}`;
                        } else {
                            result += `on ${this.DAYS[spec_dayofweek.value[0]][0]}s`;
                        }
                    } else {
                        let weekNames = spec_dayofweek.value.map((item, index, arr) => {
                            return this.DAYS[item][0];
                        })
                        result += `weeks ${this.concatenateStringList(weekNames)}`;
                    }
                }

                // Handle the day of month sentance
                if (spec_dayofmonth.original === "L"){
                    result += ` on the last day of the month`;
                } else if (spec_dayofmonth.value.length!==spec_dayofmonth.default.length){
                    if (spec_dayofmonth.value.length===1){
                        result += ` on the ${spec_dayofmonth.value[0]}${this.nth(spec_dayofmonth.value[0])} of the month`;
                    } else {
                        const str = this.nthAllIntsInString(this.concatenateStringList(this.intArrayToRangeStrings(spec_dayofmonth.value, "date"), "and"));
                        result += ` on ${(str.startsWith("the")||str.startsWith("every"))?"":"the "}${str} of the month`;
                    }
                }

                // Handle time sentance
                if (spec_hours.value.length===1&&spec_hours.value[0]===0 && spec_minutes.value.length===1&&spec_minutes.value[0]===0 &&
                    spec_seconds.value.length===1&&spec_seconds.value[0]===0 && spec_milliseconds.value.length===1&&spec_milliseconds.value[0]===0){
                    
                    result += " at midnight";

                } else {

                    if (spec_hours.value.length===spec_hours.default.length){
                        if (spec_minutes.value.length===spec_minutes.default.length){
                            result += "";
                        } else {
                            if (result===startPhrase){
                                result += " each hour";
                            } else {
                                result += ", on each hour";
                            }
                        }
                    } else if (spec_hours.value.length===1&&spec_hours.value[0]===0){
                        result += (result===startPhrase ? " " : ", ");
                        result += "at midnight";
                    } else {
                        const str = this.nthAllIntsInString(this.concatenateStringList(this.intArrayToRangeStrings(spec_hours.value, "hour")));
                        result += (result===startPhrase ? " " : ", ");
                        result += `on ${(str.startsWith("the")||str.startsWith("every"))?"":"the "}${str} hour`;
                    }

                    result += (result===startPhrase ? " " : ", ");
                    if (spec_minutes.value.length===spec_minutes.default.length){
                        result += "every minute";
                    } else if (spec_minutes.value.length===1&&spec_minutes.value[0]===0
                        &&spec_seconds.value.length===1&&spec_seconds.value[0]===0
                        &&spec_milliseconds.value.length===1&&spec_milliseconds.value[0]===0){
                        skip = true;
                        result += "precisely on the hour";
                    } else if (spec_minutes.value.length===1&&spec_minutes.value[0]===0){
                        result += "on the hour";
                    } else {
                        const str = this.nthAllIntsInString(this.concatenateStringList(this.intArrayToRangeStrings(spec_minutes.value, "minute")));
                        result += `on ${(str.startsWith("the")||str.startsWith("every"))?"":"the "}${str} minute`;
                    }
                    if (!skip){
                        if (spec_seconds.value.length===spec_seconds.default.length){
                            result += ", every second";
                        } else if (spec_seconds.value.length===1&&spec_seconds.value[0]===0){
                            if (spec_minutes.value.length===spec_minutes.default.length){
                                result += ", precisely on the minute"; // We've said "every minute" so we need to specify seconds
                            } else {
                                result += ""; // If s is 0 then we don't want to display it
                            }
                        } else {
                            const str = this.nthAllIntsInString(this.concatenateStringList(this.intArrayToRangeStrings(spec_seconds.value, "second")));
                            result += `, on ${(str.startsWith("the")||str.startsWith("every"))?"":"the "}${str} second`;
                        }
                        if (!skip){
                            if (spec_milliseconds.value.length===spec_milliseconds.default.length){
                                result += " and every millisecond";
                                if (spec_seconds.value.length===1){
                                    result += " within that second"
                                }
                            } else if (spec_milliseconds.value.length===1&&spec_milliseconds.value[0]===0){
                                result += ""; // If ms is 0 then we don't want to display it
                            } else if (spec_milliseconds.value.length===1){
                                result += ` and on the ${spec_milliseconds.value[0]}${this.nth(spec_milliseconds.value[0])} millisecond`;
                            
                            //} else if (new RegExp("^[*]?\/([12458]|10|2[05]|40|50|100|125|200|250|500)$").test(spec_milliseconds.original) && spec_milliseconds.value.length==1){
                            //    result += ` and on the ${spec_milliseconds.value[0]}${this.nth(spec_milliseconds.value[0])} millisecond`;
                            } else {
                                result += ` and on ${this.nthAllIntsInString(this.concatenateStringList(this.intArrayToRangeStrings(spec_milliseconds.value, "millisecond")))} millisecond`
                            }
                        }
                    }
                    
                }

            }
            
            // Handle the end date sentance
            if (!!spec_maxruns.value && spec_maxruns.value){
                result += `, for ${this.numberWithCommas(spec_maxruns.value)} run${spec_maxruns.value>1?'s.':'.'}`;
            } else if (!!spec_end.value && spec_end.value){
                result += `, until ${spec_end.value.getUTCDate()}${this.nth(spec_end.value.getUTCDate())} of ${this.MONTHS[spec_end.value.getUTCMonth()][0]} ${spec_end.value.getUTCFullYear()}.`;
            } else {
                result += `, until the end of time.`;
            }

        }

        return result;
    }


    // Quick check to see if the Scron is valid or not.
    isValid(){
        return this.validateResult===true;
    }


    // Validate the current format string
    // Returns an error message if it is not valid containing the invalid parameters.
    // There is room to make this validate a lot more precise however a short term solution
    // is just to redirect the user to the documentation for now.
    validate(){
        let errorArray = [];

        // Build the millisecond regex
        let _v = "[0-9]{1,3}";
        const regexMS = `([*]|((${_v}|${_v}-${_v}|[*]?\/([12458]|10|2[05]|40|50|100|125|200|250|500))((,(${_v}|${_v}-${_v}|[*]?\/[1-9]{1,3}))*)))`;

        // Build the second and minute regex
        _v = "([0-9]|[0-5][0-9])";
        const regexSe = `([*]|((${_v}|${_v}-${_v}|[*]?\/([123456]|1[025]|20|30))((,(${_v}|${_v}-${_v}|[*]?\/([123456]|1[025]|20|30)))*)))`;
        const regexMi = `([*]|((${_v}|${_v}-${_v}|[*]?\/([123456]|1[025]|20|30))((,(${_v}|${_v}-${_v}|[*]?\/([123456]|1[025]|20|30)))*)))`;
        
        // Build the hour regex
        _v = "([0-9]|1[0-9]|2[0-3])";
        const regexHo = `([*]|((${_v}|${_v}-${_v}|[*]?\/([123468]|12))((,(${_v}|${_v}-${_v}|[*]?\/([123468]|12)))*)))`;

        // Build the day of the month regex
        _v = "([1-9]|[12][0-9]|30|31)";
        const regexDm = `([*]|((([1-9]|[12][0-9]|30|31|L)|${_v}-${_v}|[*]?\/1)((,(([1-9]|[12][0-9]|30|31|L)|${_v}-${_v}|[*]?\/1))*)))`;
        
        // Build the start date regex (one of the same)
        const regexSt = "([*]|(0[1-9]|[12][0-9]|30|31)(0[1-9]|1[0-2])(2[0-5][0-9][0-9]))";

        // Build the end date / max run regex (one of the same)
        // This regex will with with either *, a date or a number between 1 and 1,000,000 - "([*]|([1-9][0-9]{0,5}|1000000)|(0[1-9]|[12][0-9]|30|31)(0[1-9]|1[0-2])(2[0-5][0-9][0-9]))";
        const regexEn = "([*]|(0[1-9]|[12][0-9]|30|31)(0[1-9]|1[0-2])(2[0-5][0-9][0-9]))";
        const regexMr = "([1-9][0-9]{0,5}|1000000)";
        const regexEnMr = "([*]|([1-9][0-9]{0,5}|1000000)|(0[1-9]|[12][0-9]|30|31)(0[1-9]|1[0-2])(2[0-5][0-9][0-9]))";

        // Build the day of the week regex
        _v = "([0-6]|sun(day)?|mon(day)?|tue(sday)?|wed(nesday)?|thu(rsday)?|fri(day)?|sat(urday)?)";
        const regexDw = `([*]|(((${_v}L?)|${_v}-${_v}|[*]?\/[123])((,(${_v}|${_v}-${_v}|[*]?\/[123]))*)))`;
        
        // Build the month regex
        _v = "(([1-9]|1[0-2])|jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)";
        const regexMo = `([*]|((${_v}|${_v}-${_v}|[*]?\/([12346]|12))((,(${_v}|${_v}-${_v}|[*]?\/([12346]|12)))*)))`;

        const rExp = new RegExp(`^(${regexMS}|(${regexMS}[ ]${regexSe})|(${regexMS}[ ]${regexSe}[ ]${regexMi})|(${regexMS}[ ]${regexSe}[ ]${regexMi}[ ]${regexHo})|(${regexMS}[ ]${regexSe}[ ]${regexMi}[ ]${regexHo}[ ]${regexDm})|(${regexMS}[ ]${regexSe}[ ]${regexMi}[ ]${regexHo}[ ]${regexDm}[ ]${regexMo})|(${regexMS}[ ]${regexSe}[ ]${regexMi}[ ]${regexHo}[ ]${regexDm}[ ]${regexMo}[ ]${regexDw})|(${regexMS}[ ]${regexSe}[ ]${regexMi}[ ]${regexHo}[ ]${regexDm}[ ]${regexMo}[ ]${regexDw}[ ]${regexSt})|(${regexMS}[ ]${regexSe}[ ]${regexMi}[ ]${regexHo}[ ]${regexDm}[ ]${regexMo}[ ]${regexDw}[ ]${regexSt}[ ]${regexEnMr}))$`,"i");
        const fullTest = rExp.test(this.formatString);
        const spec_milliseconds = this.params[this.KEY.ms];
        const spec_seconds = this.params[this.KEY.s];
        const spec_minutes = this.params[this.KEY.m];
        const spec_hours = this.params[this.KEY.h];
        const spec_dayofmonth = this.params[this.KEY.dom];
        const spec_month = this.params[this.KEY.mo];
        const spec_dayofweek = this.params[this.KEY.dow];
        const spec_start = this.params[this.KEY.st];
        const spec_end = this.params[this.KEY.en];
        const spec_maxrun = this.params[this.KEY.mr];

        // Check if we passed the full test
        if (fullTest===false){

            // If we didn't pass then lets get precise and figure out where it went wrong; we're all about
            // trying to be user friendly where possible!
            const regMS = new RegExp(`^${regexMS}$`);
            const regSe = new RegExp(`^${regexSe}$`);
            const regMi = new RegExp(`^${regexMi}$`);
            const regHo = new RegExp(`^${regexHo}$`);
            const regDm = new RegExp(`^${regexDm}$`);
            const regMo = new RegExp(`^${regexMo}$`);
            const regDw = new RegExp(`^${regexDw}$`);
            const regSt = new RegExp(`^${regexSt}$`);
            const regEn = new RegExp(`^${regexEn}$`);
            const regMr = new RegExp(`^${regexMr}$`);

            // Check each parameter to see if its correct or not
            if (!!spec_milliseconds.original && !regMS.test(spec_milliseconds.original)){ errorArray.push("Milliseconds[1]"); }
            if (!!spec_seconds.original && !regSe.test(spec_seconds.original)){ errorArray.push("Seconds[2]"); }
            if (!!spec_minutes.original && !regMi.test(spec_minutes.original)){ errorArray.push("Minutes[3]"); }
            if (!!spec_hours.original && !regHo.test(spec_hours.original)){ errorArray.push("Hours[4]"); }
            if (!!spec_dayofmonth.original && !regDm.test(spec_dayofmonth.original)){ errorArray.push("Day of Month[5]"); }
            if (!!spec_month.original && !regMo.test(spec_month.original)){ errorArray.push("Month[6]"); }
            if (!!spec_dayofweek.original && !regDw.test(spec_dayofweek.original)){ errorArray.push("Day of Week[7]"); }
            if (!!spec_start.original && !regSt.test(spec_start.original)){ errorArray.push("Start Date[8]"); }
            
            // End date requires some additional validation
            if ((!!spec_end.original && !regEn.test(spec_end.original)) ||
                (!!spec_maxrun.value && !regMr.test(spec_maxrun.value)) ||
                (!!spec_maxrun.value && (!spec_start.original || spec_start.original==="*"))){ 
                    errorArray.push("End Date[9]");
            }

        } else {

            // Few additional checks - the format may be correct but certain criteria still needs to be checked

            // A max run end date cannot be supplied if no start date has been provided
            if (!!spec_maxrun.value && (!spec_start.original || spec_start.original==="*")){ 
                errorArray.push("End Date[9]");
            }

        }

        return errorArray.length>0 ? `Invalid ${this.concatenateStringList(errorArray)}.` : true;
    }   


    // Get the next run time
    nextRun(fromDate) {
        try {

            // Check to see if we have a from date, if we do then we need to increment by a single
            // millisecond, this is because if we pass through a previously calcuated nextRun date
            // it will just keep producing the same date over and over again because the new date
            // would be >= the passed in date. 1ms isn't going to make a difference!
            // Otherwise just use the current date
            //const now = fromDate ? new Date(new Date(fromDate).getTime()+1) : new Date();

            // For ease lets just grab out the values we want
            const milliseconds = this.params[this.KEY.ms].value;
            const seconds = this.params[this.KEY.s].value;
            const minutes = this.params[this.KEY.m].value;
            const hours = this.params[this.KEY.h].value;
            const dayofmonth = this.params[this.KEY.dom].value;
            const month = this.params[this.KEY.mo].value;
            const dayofweek = this.params[this.KEY.dow].value;
            const start = this.params[this.KEY.st].value;
            const end = this.params[this.KEY.en].value;
            const maxRuns = this.params[this.KEY.mr].value;
            let runCount = 0;

            // Work out when we want to start counting from and when we're happy to stop
            //const _startFromDate = !!maxRuns && (!!start && start.getTime()<new Date()) ? start : fromDate ? new Date(new Date(fromDate).getTime()+1) : new Date();
            const _startFromDate = fromDate ? new Date(new Date(fromDate).getTime()+1) : !!start&&!!maxRuns ? start : !!start&&(new Date(start)>new Date()) ? start : new Date();
            const _endAfterDate = !maxRuns ? new Date(_startFromDate) : new Date();
            
            // Create some pre-set responses for the isRunnable function
            const RUNNABLE_RESULT = {
                NOT:1,
                CONTINUE:2,
                RUNNABLE:3
            }

            // Function to check if the given date is within our runnable range
            const isRunnable = (date) => {
                if (maxRuns){

                    // We have a max run so we need to check if the date is greater than the end date - if its not
                    // we still want to continue through the loops so we can calculate how many valid runs have occured
                    // since the start
                    const res =date < _startFromDate ? RUNNABLE_RESULT.NOT : date >= _endAfterDate ? RUNNABLE_RESULT.RUNNABLE : RUNNABLE_RESULT.CONTINUE;
                    return res;

                } else {
                    
                    return (date >= _endAfterDate && (!_startFromDate || date >= _startFromDate) && (!end || date <= end)) ? RUNNABLE_RESULT.RUNNABLE : RUNNABLE_RESULT.NOT;

                }
            }

            // Run a loop over the larger items to the more precise items in order to find the next available
            // schedule date - I'm currently thinking this might be a little painful to do but we'll see.
            // Hopefully it won't take too long to calculate out.
            let nextSchedule = null;
            let calcTime;
            
            loop_year:
            for(let y=_startFromDate.getUTCFullYear(); y<=(!!end?end.getUTCFullYear():(_startFromDate.getUTCFullYear()+10)); y++){
                calcTime = new Date(_startFromDate);
                calcTime.setUTCFullYear(y);
                
                if (isRunnable(calcTime)!==RUNNABLE_RESULT.NOT){
                    loop_month:
                    for(let mo=0; mo<month.length; mo++){
                        calcTime = new Date(_startFromDate);
                        calcTime.setUTCDate(1); 
                        calcTime.setUTCMonth(month[mo]-1);
                        calcTime.setUTCFullYear(y);
                        
                        loop_date:
                        for(let d=0; d<dayofmonth.length; d++){
                            const lastDateInMonth = new Date(y, month[mo], 0).getUTCDate();
                            if (!!this.params[this.KEY.dom].original && this.params[this.KEY.dom].original.indexOf("L")>-1){
                                if (lastDateInMonth===dayofmonth[d]){
                                    calcTime.setUTCDate(dayofmonth[d]);
                                } else {
                                    continue;
                                }
                            } else {
                                calcTime.setUTCDate(dayofmonth[d]);
                            }
                            
                            if (isRunnable(calcTime)!==RUNNABLE_RESULT.NOT && dayofweek.indexOf(calcTime.getUTCDay())>-1 && (!this.params[this.KEY.dow].original || !this.params[this.KEY.dow].original.endsWith("L") || dayofmonth[d] > (lastDateInMonth-7))){
                                loop_hour:
                                for(let h=0; h<hours.length; h++){
                                    calcTime.setUTCHours(hours[h]);
                                    
                                    if (isRunnable(calcTime)!==RUNNABLE_RESULT.NOT){
                                        loop_minute:
                                        for(let m=0; m<minutes.length; m++){
                                            calcTime.setUTCMinutes(minutes[m]);
                                            
                                            if (isRunnable(calcTime)!==RUNNABLE_RESULT.NOT){
                                                loop_second:
                                                for(let s=0; s<seconds.length; s++){
                                                    calcTime.setUTCSeconds(seconds[s]);
                                                    
                                                    if (isRunnable(calcTime)!==RUNNABLE_RESULT.NOT){
                                                        loop_millisecond:
                                                        for(let ms=0; ms<milliseconds.length; ms++){
                                                            calcTime.setUTCMilliseconds(milliseconds[ms]);
                                                            
                                                            // Now lets check if its runnable
                                                            switch(isRunnable(calcTime)){
                                                                case RUNNABLE_RESULT.RUNNABLE:

                                                                    // We've reached a date that will be the next run time - break out of the entire process
                                                                    nextSchedule = calcTime;
                                                                    break loop_year;

                                                                case RUNNABLE_RESULT.CONTINUE:

                                                                    // This is a valid date so lets increase our run count
                                                                    runCount += 1;

                                                                    // Before we disapear check to see if the count is greater than any max allowed run
                                                                    // times value. If it is then we need to quit out
                                                                    if (runCount >= maxRuns){
                                                                        break loop_year;
                                                                    }
                                                                    break;

                                                                default:

                                                                    // Not interested
                                                                    break;

                                                            }
                                                            
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            // Did we find a schedule?
            if (nextSchedule){
                return nextSchedule;
            } else {
                return null;
            }
            
        } catch(e){

            console.log(e);
            return e;
            
        }
    }

    // Function to trigger a callback at the time of the specified scron
    // NOTE - any scron being used here cannot have a start date more than about
    // 18 days from now, nor can there being any intervals of time greater than
    // this during the schedule as this equates to a wait period greater than a 32bit
    // integer can hold so it'll crash setInterval! - todo; look for alternative to setInterval!?
    /*
        {
            callback, -- Function to call on complete
            synchronous -- If true we'll call the callback and await a response before continuing
            startDate -- specify a start date that you want your timings to run from - 
        }
    */
    run(params){
        const callback = params.callback;
        const run_synchronous = params.synchronous===true;
        let start_date = params.startDate ? new Date(params.startDate).getTime() : null;
        let next_run = null;

        // If we have a startDate specified then we'll use this to delay our running
        setTimeout(() => {
            
            // Inner function to rerun the function
            const onReRun = () => {
                this.run({
                    ...params,
                    startDate:null
                }); 
            }

            // Inner function to return on complete
            const onComplete = (state, error) => {
                
                // Build our return object
                let returnObj = {
                    state: state,
                    run: run_synchronous===true ? onReRun : null
                }

                // Add error ir we have one
                if (error){
                    returnObj.error = error;
                }

                // Call the callback now
                callback(returnObj);

                // If we're not running synchronously then we can recall the run now presuming we're
                // also in a runnable state (based on the last calculated next_run date)
                if (run_synchronous!==true && state===this.RunStates.Running){
                    onReRun();
                }
                
            }

            // Begin the process by calculating the delay
            next_run = this.nextRun();

            // Check the next run time is valid - if so we'll setup the timeout to wait
            // before calling the callback at the appropriate time
            if (next_run){
                
                // Check if the next run time is a date value
                if (!(next_run instanceof Date)) {
                    
                    // Not a date value which means its likely an error message!
                    onComplete(this.RunStates.Error, next_run);

                } else if (next_run.getTime()>(new Date().getTime()+this.MAX_SETINTERVAL_VALUE)){
                    
                    // The next run time cannot be too far into the future - setTimeout can only accespt 32bit integer so
                    // if we go too high (or too far into the future) then the int will be too great for it to handle.
                    onComplete(this.RunStates.Error, `Start date too far in the future. Please select a date less than ${Scron.toDateFormat(new Date(new Date().getTime()+this.MAX_SETINTERVAL_VALUE), "dddd dd^ MMMM yyyy HH:mm:ss:fff")}`);
    
                } else {
                    
                    // Calculate the ms delay between the starting date and now - we'll ignore anything that is now in the past
                    // this is a little bit of a debatable conditional but occasionally I was finding the run going through so quick
                    // it was producing the same run time only the latter was in the past by the time it got here...
                    const msDelay = next_run-new Date().getTime();
                    if (msDelay>-1){
                        setTimeout(() => {
                            onComplete(this.RunStates.Running);
                        }, msDelay);
                    } else {
                        onReRun();
                    }

                }

            } else {
                
                // No next run value was found so we've most likely hit the end of the
                // possible date range specified in the Scron - or we ran into an error
                // but we're not currently supporting that just here yet (todo)
                onComplete(this.RunStates.Finished);

            }
            
        }, start_date ? Math.max(0, new Date(start_date).getTime()-new Date().getTime()) : 0);
        
    }

}
module.exports = Scron;