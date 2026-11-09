(function(){
function hdr(w,h,inner){return '<svg viewBox="0 0 '+w+' '+h+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="diagram" font-family="sans-serif">'+inner+'</svg>';}
var pts=[[1804,1],[1927,2],[1960,3],[1974,4],[1987,5],[1999,6],[2011,7],[2022,8]];
function px(y){return 50+(y-1800)/(2030-1800)*340;}
function py(b){return 190-b*20;}
var line='';pts.forEach(function(p,i){line+=(i?'L':'M')+px(p[0]).toFixed(0)+','+py(p[1]);});
var dots=pts.map(function(p){return '<circle cx="'+px(p[0]).toFixed(0)+'" cy="'+py(p[1])+'" r="4" fill="#c0392b"/>';}).join('');
var ygrid='';for(var b=0;b<=8;b+=2){ygrid+='<text x="44" y="'+(py(b)+4)+'" text-anchor="end" font-size="11">'+b+'</text><line x1="50" y1="'+py(b)+'" x2="395" y2="'+py(b)+'" stroke="#e3dcf1"/>';}
var xl='';[1800,1900,2000].forEach(function(y){xl+='<text x="'+px(y).toFixed(0)+'" y="208" text-anchor="middle" font-size="11">'+y+'</text>';});
var pop=hdr(420,235,'<text x="210" y="16" text-anchor="middle" font-size="13" font-weight="700">World population (billions of people)</text>'+ygrid+'<line x1="50" y1="30" x2="50" y2="190" stroke="#2a2340"/><line x1="50" y1="190" x2="395" y2="190" stroke="#2a2340"/><path d="'+line+'" fill="none" stroke="#6d3fc0" stroke-width="3"/>'+dots+xl+'<g font-size="10" fill="#2a2340"><text x="'+px(1974)+'" y="'+(py(4)-8)+'" text-anchor="middle">1974: 4 bn</text><text x="'+px(2011)+'" y="'+(py(7)-8)+'" text-anchor="middle">2011: 7 bn</text></g>');
var pie=hdr(320,200,'<circle cx="100" cy="100" r="85" fill="#6d3fc0"/><path d="M100,100 L100,15 A85,85 0 0 1 185,100 Z" fill="#f2b705"/><path d="M100,100 L185,100 A85,85 0 0 1 144,173 Z" fill="#1f8a4c"/><path d="M100,100 L144,173 A85,85 0 0 1 100,185 Z" fill="#c0392b"/><g font-size="12"><rect x="205" y="40" width="12" height="12" fill="#6d3fc0"/><text x="222" y="51">Farming 50%</text><rect x="205" y="64" width="12" height="12" fill="#f2b705"/><text x="222" y="75">Homes 25%</text><rect x="205" y="88" width="12" height="12" fill="#1f8a4c"/><text x="222" y="99">Industry 20%</text><rect x="205" y="112" width="12" height="12" fill="#c0392b"/><text x="222" y="123">Other 5%</text></g><text x="160" y="192" text-anchor="middle" font-size="11" fill="#6f6888">How a town uses its water</text>');
ONTI_REGISTER({key:"geography",subject:"Social Sciences: Geography",title:"Geography: Population, Health and Resources",emoji:"🌍",minutes:30,
blurb:"Population growth, diseases, natural resources, conservation and eco-tourism with a graph and a pie chart. Based on your November Geography paper.",
topics:{
 pop:{label:"Population growth and change",tips:["Population grows when births are more than deaths, or when more people move in (immigration).","Better health care and medical science help people live longer, so populations grow.","Life expectancy = the number of years people can expect to live."],search:["world population growth causes","birth rate death rate migration"]},
 dis:{label:"Diseases and health",tips:["Malaria: a parasite spread by mosquitoes. TB: spread by coughing, linked to poverty and HIV. Diarrhoea: dirty water and poor sanitation.","Epidemic: spreads quickly in an area. Pandemic: spreads across many countries."],search:["malaria TB HIV diarrhoea causes Africa grade 7","epidemic vs pandemic"]},
 res:{label:"Natural resources and conservation",tips:["Renewable resources replace themselves (wind, sun, water, trees). Non-renewable do not (coal, oil, gold).","Conservation means protecting resources: reduce, reuse, recycle."],search:["renewable and non-renewable resources","conservation reduce reuse recycle"]},
 eco:{label:"Eco-tourism",tips:["Eco-tourism is travel to natural areas that protects the environment and helps local people."],search:["eco-tourism for kids South Africa"]},
 data:{label:"Graphs and data",tips:["Read the title and scale. For a pie chart, the whole circle is 100%."],search:["how to read a line graph and pie chart"]}
},
passages:{
 pop:{title:"World population graph",svg:pop},
 pie:{title:"Pie chart",svg:pie}
},
questions:[
 MC("pop","Is the world population increasing or decreasing?",["Increasing","Decreasing","Staying the same","Cannot tell"],0,"The line on the graph goes up.",{p:"pop"}),
 NUM("pop","In which year did the world population reach 4 billion?",1974,"Read across from 4 billion on the graph.",{p:"pop",tol:0}),
 NUM("pop","How many years did it take to grow from 6 billion (1999) to 7 billion (2011)?",12,"2011 - 1999 = 12 years.",{p:"pop",unit:"years"}),
 MC("pop","Which TWO things help the population increase?",["Better health care and medical developments","High infant mortality and war","Limiting family sizes and famine","Pollution and disease"],0,"Better health care means fewer deaths and longer lives."),
 MATCH("pop","Match the term to its meaning.",[["Life expectancy","Number of years people can expect to live"],["Immigration","People moving INTO a country"],["Emigration","People moving OUT of a country"],["Birth rate","Number of babies born per 1 000 people"]],"Know these population words."),
 MC("pop","Population density measures...",["people per square kilometre","the number of cities","the age of people","the number of hospitals"],0,"Density = how crowded an area is."),
 MC("dis","Malaria is caused by a ______ that is spread by ______.",["germ; insects","germ; mosquitoes","parasite; insects","parasite; mosquitoes"],3,"A parasite carried by Anopheles mosquitoes."),
 MC("dis","Two main reasons for the spread of TB are...",["Lack of medical care and HIV","Poverty and HIV","Dirty water and poor sanitation","Lack of knowledge and no hygiene"],1,"Poverty (overcrowding, poor nutrition) and HIV weaken people."),
 MC("dis","Which disease does NOT have a cure at present?",["TB","Diarrhoea","Malaria","HIV/AIDS"],3,"HIV can be controlled with medicine but not cured."),
 MC("dis","What mainly causes diarrhoea?",["Dirty water and poor sanitation","Cold weather","Too much sun","Mountains"],0,"Safe water, toilets and handwashing prevent it."),
 MATCH("dis","Match the word to its meaning.",[["Parasite","Lives on or in another living thing"],["Pandemic","A disease that spreads across many countries"],["Gastroenteritis","An infection of the bowel"],["Factors","Things that influence what happens"]],"Words from your paper."),
 MC("dis","In the clinic news story people queue from 05:00 because...",["there is no clinic near their village and few clinics","clinics are free","they like queuing","clinics open at midnight"],0,"Poor access to health care is a big problem in rural areas."),
 MATCH("res","Match the resource to its type.",[["Sunlight","Renewable"],["Coal","Non-renewable"],["Wind","Renewable"],["Gold","Non-renewable"]],"Renewable resources can be replaced."),
 MC("res","Conservation means...",["Protecting and wisely using natural resources","Using as much as possible","Destroying forests","Burning coal"],0,"Conserve: look after for the future."),
 MC("res","Which is the best example of RECYCLING?",["Turning old glass bottles into new glass","Throwing bottles away","Burning plastic","Burying batteries"],0,"Recycling turns waste into new products."),
 TF("res","South Africa has plenty of water and never needs to save it.",false,"South Africa is a water-scarce country."),
 MC("eco","Eco-tourism is...",["Travelling to natural places in a way that protects them and helps local people","Visiting big shopping malls","Flying as much as possible","Building hotels in a national park"],0,"It protects nature and benefits communities."),
 MC("eco","Which is an example of eco-tourism?",["A guided game walk in a nature reserve run by the local community","A loud quad-bike race through a wetland","Dumping rubbish at a beach","Cutting down a forest for a hotel"],0,"Eco-tourism is low impact."),
 MC("data","In the pie chart, which is the BIGGEST use of water?",["Farming","Homes","Industry","Other"],0,"Farming takes 50%.",{p:"pie"}),
 NUM("data","What percentage of water is used by homes AND industry together?",45,"25% + 20% = 45%.",{p:"pie",unit:"%"}),
 NUM("data","If the town uses 1 000 kilolitres of water, how many kilolitres does farming use?",500,"50% of 1 000 = 500.",{p:"pie",unit:"kl"}),
 MC("data","What fraction of the pie chart is Homes (25%)?",["1/4","1/2","1/3","1/5"],0,"25% = 25/100 = 1/4.",{p:"pie"})
]});})();
