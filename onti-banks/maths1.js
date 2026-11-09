(function(){
function hdr(w,h,inner){return '<svg viewBox="0 0 '+w+' '+h+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="diagram" font-family="sans-serif">'+inner+'</svg>';}
var nl='<g stroke="#2a2340" stroke-width="2"><line x1="20" y1="60" x2="400" y2="60"/></g>';
var ticks='';for(var i=-5;i<=5;i++){var x=210+i*34;ticks+='<line x1="'+x+'" y1="52" x2="'+x+'" y2="68" stroke="#2a2340" stroke-width="2"/><text x="'+x+'" y="88" text-anchor="middle" font-size="13">'+i+'</text>';}
var numline=hdr(420,110,nl+ticks+'<circle cx="'+(210-3*34)+'" cy="60" r="8" fill="#c0392b"/><text x="'+(210-3*34)+'" y="40" text-anchor="middle" font-size="16" font-weight="700" fill="#c0392b">P</text>');
function sq(x,n){var s='';for(var k=0;k<n;k++){s+='<rect x="'+(x+k*30)+'" y="20" width="30" height="30" fill="none" stroke="#6d3fc0" stroke-width="4"/>';}return s;}
var sticks=hdr(420,130,'<g>'+sq(10,1)+'</g><g>'+sq(110,2)+'</g><g>'+sq(250,3)+'</g><text x="25" y="75" font-size="13">Figure 1</text><text x="125" y="75" font-size="13">Figure 2</text><text x="265" y="75" font-size="13">Figure 3</text><text x="210" y="115" text-anchor="middle" font-size="12" fill="#6f6888">Each square is made of matchsticks. Squares share sides.</text>');
var flow=hdr(420,110,'<g stroke="#2a2340" stroke-width="2" fill="#ede5fb"><rect x="10" y="30" width="70" height="40" rx="8"/><rect x="130" y="30" width="80" height="40" rx="8"/><rect x="260" y="30" width="80" height="40" rx="8"/><rect x="360" y="30" width="55" height="40" rx="8" fill="#e6f6ed"/></g><g font-size="15" text-anchor="middle" font-weight="700"><text x="45" y="56">Input x</text><text x="170" y="56">× 3</text><text x="300" y="56">+ 2</text><text x="387" y="56">Output</text></g><g stroke="#2a2340" stroke-width="2"><line x1="80" y1="50" x2="130" y2="50"/><line x1="210" y1="50" x2="260" y2="50"/><line x1="340" y1="50" x2="360" y2="50"/></g>');
var table=hdr(300,130,'<g stroke="#2a2340" stroke-width="2" fill="none"><rect x="20" y="10" width="260" height="100"/><line x1="20" y1="40" x2="280" y2="40"/><line x1="20" y1="70" x2="280" y2="70"/><line x1="150" y1="10" x2="150" y2="110"/></g><g font-size="15" text-anchor="middle"><text x="85" y="31" font-weight="700">Input (x)</text><text x="215" y="31" font-weight="700">Output (y)</text><text x="85" y="61">1</text><text x="215" y="61">5</text><text x="85" y="91">2</text><text x="215" y="91">8</text></g><text x="150" y="124" text-anchor="middle" font-size="11" fill="#6f6888">Rule: y = 3x + 2</text>');
ONTI_REGISTER({key:"maths1",subject:"Mathematics",title:"Mathematics Paper 1: Numbers, Operations, Patterns and Algebra",emoji:"➕",minutes:45,
blurb:"Everything on the Paper 1 scope: whole numbers, fractions, decimals, percentages, ratio, money, exponents, integers, patterns and functions. Show your thinking on rough paper first!",
topics:{
 whole:{label:"Whole numbers, factors and multiples",tips:["BODMAS: Brackets, Orders (powers), Division/Multiplication, Addition/Subtraction.","HCF = biggest number that divides both. LCM = smallest number both go into.","A prime number has exactly 2 factors (1 and itself)."],search:["BODMAS","HCF and LCM","prime factorisation"]},
 frac:{label:"Fractions",tips:["To add fractions make the denominators the same first.","Multiply fractions: top x top, bottom x bottom, then simplify.","Fraction of a number: divide by the bottom, multiply by the top."],search:["adding fractions different denominators","mixed numbers improper fractions"]},
 dec:{label:"Decimal fractions",tips:["Line up the decimal commas when adding and subtracting.","To order decimals compare place by place (tenths, hundredths, thousandths)."],search:["adding and multiplying decimals","ordering decimals"]},
 perc:{label:"Percentages",tips:["10% = divide by 10. 1% = divide by 100.","Increase: add the percentage amount. Decrease/discount: subtract it."],search:["percentage of an amount","percentage increase and decrease"]},
 ratio:{label:"Ratio and rate",tips:["Simplify ratios by dividing both parts by the same number.","To share in a ratio: add the parts, find one part, then multiply."],search:["sharing in a ratio","rate speed distance time"]},
 fin:{label:"Financial mathematics",tips:["Simple interest = amount x rate x time.","Profit = selling price - cost price. Loss is the other way round."],search:["simple interest","profit loss discount"]},
 exp:{label:"Exponents",tips:["Square: n x n. Cube: n x n x n.","Square root undoes the square, cube root undoes the cube.","Do powers BEFORE multiplying and adding."],search:["exponents squares cubes roots grade 7"]},
 int:{label:"Integers",tips:["Use a number line. Moving right adds, moving left subtracts.","Negative numbers get smaller as they get further from zero: -7 < -2."],search:["adding and subtracting integers","ordering integers"]},
 pat:{label:"Patterns and sequences",tips:["Find the difference between terms to get the rule.","Rule for a growing pattern: look at how many are added each figure."],search:["number patterns grade 7","geometric patterns matchsticks"]},
 func:{label:"Functions and relationships",tips:["Follow the flow diagram step by step with the input.","To find the rule, look at how the output changes when the input goes up by 1."],search:["input output flow diagrams","functions and relationships grade 7"]}
},
questions:[
 NUM("whole","Calculate: 19 - 8 × 2 + (12 ÷ 3)",7,"BODMAS: brackets first (4), then 8×2=16, then 19 - 16 + 4 = 7.",{hint:"Brackets, then multiply, then add and subtract left to right."}),
 NUM("whole","Round off 4 768 to the nearest hundred.",4800,"The tens digit is 6 so round up: 4 800."),
 MC("whole","Which number is a PRIME number?",["21","29","33","39"],1,"29 only has factors 1 and 29. The others divide by 3."),
 MC("whole","What is the prime factorisation of 36?",["2 × 18","4 × 9","2 × 2 × 3 × 3","6 × 6"],2,"Break all the way down to primes: 36 = 2 × 2 × 3 × 3."),
 NUM("whole","What is the HCF of 12 and 18?",6,"Factors of 12: 1,2,3,4,6,12. Of 18: 1,2,3,6,9,18. Biggest common: 6."),
 NUM("whole","What is the LCM of 4 and 6?",12,"Multiples of 4: 4,8,12. Of 6: 6,12. The first common is 12."),
 NUM("whole","Calculate: 1 344 ÷ 16",84,"16 × 84 = 1 344.",{hint:"Use long division, or check with 16 × 80 = 1 280."}),
 NUM("whole","Calculate: 347 × 26",9022,"347 × 20 = 6 940 and 347 × 6 = 2 082. Together 9 022."),
 TX("frac","Calculate: 2/3 + 1/6 (write as a fraction, e.g. 1/2)",["5/6"],"2/3 = 4/6. Then 4/6 + 1/6 = 5/6."),
 NUM("frac","Calculate: 3/4 of 24",18,"24 ÷ 4 = 6, then 6 × 3 = 18."),
 TX("frac","Simplify: 18/24",["3/4"],"Divide top and bottom by 6."),
 TX("frac","Write 17/5 as a mixed number (e.g. 1 1/2)",["3 2/5"],"17 ÷ 5 = 3 remainder 2, so 3 2/5."),
 TX("frac","Calculate: 1/2 × 2/5 (simplified)",["1/5","2/10"],"Top × top = 2, bottom × bottom = 10. 2/10 = 1/5."),
 NUM("dec","Calculate: 3.4 + 2.75",6.15,"Line up the commas: 3.40 + 2.75 = 6.15."),
 NUM("dec","Calculate: 12.5 × 4",50,"12 × 4 = 48 and 0.5 × 4 = 2. Total 50."),
 TX("dec","Write 0.75 as a common fraction in simplest form.",["3/4"],"0.75 = 75/100 = 3/4."),
 ORDER("dec","Put these decimals in order from SMALLEST to biggest.",["0.125","0.25","0.5","0.75"],"Compare tenths first: 0.1, 0.2, 0.5, 0.7."),
 NUM("perc","What is 25% of R240? (number only)",60,"25% = a quarter. 240 ÷ 4 = 60.",{unit:"rand"}),
 NUM("perc","Write 3/5 as a percentage (number only).",60,"3/5 = 6/10 = 60%.",{unit:"%"}),
 NUM("perc","A jacket costs R200. The price goes UP by 15%. What is the new price?",230,"15% of 200 = 30. 200 + 30 = R230.",{unit:"rand"}),
 NUM("perc","A pair of shoes costs R350. There is a 20% discount. What do you pay?",280,"20% of 350 = 70. 350 - 70 = R280.",{unit:"rand"}),
 TX("ratio","Simplify the ratio 12 : 18 (write like 2:3)",["2:3","2 : 3"],"Divide both by 6 to get 2 : 3."),
 NUM("ratio","Share R60 in the ratio 2 : 3. How much is the BIGGER share?",36,"2 + 3 = 5 parts. 60 ÷ 5 = 12 per part. 3 × 12 = R36.",{unit:"rand"}),
 NUM("ratio","A car travels 240 km in 3 hours. What is its speed in km/h?",80,"Rate = distance ÷ time = 240 ÷ 3 = 80.",{unit:"km/h"}),
 NUM("ratio","4 pens cost R18. How much do 10 pens cost?",45,"One pen = R4.50. Ten pens = R45.",{unit:"rand"}),
 NUM("fin","Calculate the simple interest on R1 000 at 10% per year for 2 years.",200,"10% of R1 000 = R100 per year. Two years = R200.",{unit:"rand"}),
 NUM("fin","A trader buys a bag for R45 and sells it for R60. What is the profit?",15,"Profit = selling price - cost price = 60 - 45.",{unit:"rand"}),
 NUM("exp","Calculate: 2³ + 3²",17,"2³ = 8 and 3² = 9. 8 + 9 = 17."),
 NUM("exp","Calculate: 3 + 2² × 5",23,"Power first: 2² = 4. Then 4 × 5 = 20. Then 3 + 20 = 23."),
 NUM("exp","What is the square root of 81?",9,"9 × 9 = 81."),
 NUM("exp","What is the cube root of 27?",3,"3 × 3 × 3 = 27."),
 NUM("int","Calculate: -5 + 8",3,"Start at -5 and move 8 to the right to reach 3."),
 NUM("int","Calculate: 4 - 9",-5,"Start at 4 and move 9 to the left to reach -5."),
 MC("int","Which integer is point P on the number line?",["-4","-3","3","-2"],1,"P is 3 steps left of zero.",{svg:numline}),
 ORDER("int","Put these integers in order from SMALLEST to biggest.",["-7","-2","0","3"],"Negatives are smaller than zero. -7 is further left than -2."),
 NUM("int","The temperature was -3°C in the morning and rose to 5°C. By how many degrees did it rise?",8,"From -3 to 0 is 3, then 0 to 5 is 5. Total 8.",{unit:"degrees"}),
 NUM("pat","What is the next number? 3; 7; 11; 15; ...",19,"The pattern adds 4 each time."),
 TX("pat","What is the rule of the pattern 3; 7; 11; 15? (e.g. add 2)",["add 4","+4","+ 4","plus 4","adding 4","add four"],"The terms increase by 4."),
 NUM("pat","The matchstick pattern: Figure 1 uses 4 sticks, Figure 2 uses 7, Figure 3 uses 10. How many sticks in Figure 4?",13,"Each new square adds 3 sticks: 10 + 3 = 13.",{svg:sticks}),
 NUM("pat","Using the same matchstick pattern (rule: 3 × figure number + 1), how many sticks in Figure 10?",31,"3 × 10 + 1 = 31.",{svg:sticks}),
 NUM("func","Look at the flow diagram. What is the output when the input is 4?",14,"4 × 3 = 12, then 12 + 2 = 14.",{svg:flow}),
 NUM("func","Look at the table (rule y = 3x + 2). What is y when x = 5?",17,"3 × 5 = 15, then 15 + 2 = 17.",{svg:table}),
 NUM("func","Use the formula y = 2x - 3. Find y when x = 6.",9,"2 × 6 = 12, then 12 - 3 = 9."),
 NUM("whole","A class has 36 learners. 5/9 of them are girls. How many boys are there?",16,"Girls: 36 ÷ 9 × 5 = 20. Boys: 36 - 20 = 16.")
]});})();
