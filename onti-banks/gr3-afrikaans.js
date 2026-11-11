(function(){
function sv(w,h,i,l){return '<svg viewBox="0 0 '+w+' '+h+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+l+'" font-family="sans-serif">'+i+'</svg>';}
var dier=sv(320,110,'<text x="10" y="64" font-size="54">🐶</text><text x="90" y="64" font-size="54">🐱</text><text x="170" y="64" font-size="54">🐦</text><text x="250" y="64" font-size="54">🐟</text><text x="14" y="96" font-size="14">hond</text><text x="98" y="96" font-size="14">kat</text><text x="176" y="96" font-size="14">voël</text><text x="256" y="96" font-size="14">vis</text>','Diere');
var kleure=sv(320,90,'<circle cx="40" cy="40" r="26" fill="#e53935"/><circle cx="110" cy="40" r="26" fill="#1e88e5"/><circle cx="180" cy="40" r="26" fill="#43a047"/><circle cx="250" cy="40" r="26" fill="#fdd835"/><text x="40" y="84" text-anchor="middle" font-size="13">rooi</text><text x="110" y="84" text-anchor="middle" font-size="13">blou</text><text x="180" y="84" text-anchor="middle" font-size="13">groen</text><text x="250" y="84" text-anchor="middle" font-size="13">geel</text>','Kleure');
ONTI_REGISTER({key:"gr3-afrikaans",subject:"Afrikaans First Additional Language",title:"Graad 3 Afrikaans: Lees en Leer",emoji:"🦒",minutes:25,
blurb:"Lees die storie en beantwoord die vrae. Daar is ook woordjies, kleure, diere en kort sinne. Jy kan dit doen!",
topics:{
 lees:{label:"Lees en verstaan",tips:["Lees die storie twee keer.","Die antwoord is in die storie. Kyk terug!","Skryf jou antwoord in 'n volsin as die vraag dit vra."],search:["Afrikaans leesbegrip graad 3"]},
 woord:{label:"Woordeskat",tips:["Leer die woorde vir diere, kleure, familie en kos.","Gebruik prente om die woorde te onthou."],search:["Afrikaans woorde vir kinders","Afrikaans diere en kleure"]},
 taal:{label:"Taal en sinne",tips:["'n Sin begin met 'n hoofletter.","Eindig met 'n punt (.), vraagteken (?) of uitroepteken (!).","Voorsetsels: in, op, onder, by, na, teen."],search:["Afrikaans voorsetsels graad 3","Afrikaans sinne en leestekens"]}
},
passages:{
 hasie:{title:"Hendrik Hasie en die storm",text:"Hendrik Hasie kan nie slaap nie. Hy is baie bang. Hy hoor die wind waai baie sterk buite.\n\nHy steek sy koppie by die gat uit. Hy sien die wind waai die bome heen en weer. Skielik sien hy ’n blits en hoor harde donderweer. Hendrik word nog banger. Hy knyp sy ogies styf toe.\n\nSkielik is dit doodstil. Die wind het gaan lê, die blitse is weg en die donderweer het opgehou. Hendrik Hasie weet nou die storm is verby en hy is veilig. Nou kan hy rustig gaan slaap."},
 dier:{title:"Diere",svg:dier},
 kleur:{title:"Kleure",svg:kleure}
},
questions:[
 MC("lees","Kies die beste titel vir die storie.",["Hendrik Hasie is bang vir die storm","Oupa Uil slaap","Die son skyn","Ons gaan strand toe"],0,"Die hele storie gaan oor Hendrik se vrees vir die storm.",{p:"hasie"}),
 MC("lees","Hoe voel Hendrik Hasie in die begin?",["Bly","Bang","Honger","Moeg en gelukkig"],1,"Die storie sê hy is baie bang.",{p:"hasie"}),
 MC("lees","Wat hoor Hendrik buite?",["Musiek","Die wind waai","Kinders","’n Hond blaf"],1,"Hy hoor die wind waai baie sterk.",{p:"hasie"}),
 TF("lees","Hendrik sien ’n blits en hoor donderweer.",true,"Dit staan in paragraaf 2.",{p:"hasie"}),
 MC("lees","Wat gebeur aan die einde van die storie?",["Dit begin sneeu","Die storm is verby","Hy loop weg","Dit reën baie hard"],1,"Dit word doodstil en die storm is verby.",{p:"hasie"}),
 ORDER("lees","Sit die sinne in die regte volgorde.",["Hendrik Hasie kan nie slaap nie.","Hy sien ’n blits.","Hy knyp sy ogies styf toe.","Die storm is verby."],"Dit is hoe die storie verloop het.",{p:"hasie"}),
 MC("lees","Wat beteken “doodstil”?",["Baie hard","Heeltemal stil","Baie vinnig","Baie warm"],1,"Doodstil beteken heeltemal stil, geen geluid nie.",{p:"hasie"}),
 TX("lees","Hoekom is Hendrik Hasie veilig? Skryf ’n kort antwoord.",["die storm is verby","storm verby","want die storm is verby","die storm het opgehou","storm is verby"],"Hy is veilig omdat die storm verby is.",{p:"hasie",kw:["storm","verby","opgehou"],need:1,show:"Die storm is verby."}),
 MC("woord","Wat is “hond” in Engels?",["Cat","Dog","Bird","Fish"],1,"Hond = dog.",{p:"dier"}),
 MC("woord","Wat is “kat” in Engels?",["Cat","Dog","Bird","Cow"],0,"Kat = cat.",{p:"dier"}),
 MC("woord","Wat is “voël” in Engels?",["Bear","Bird","Fish","Frog"],1,"Voël = bird.",{p:"dier"}),
 MC("woord","Watter kleur is die middelste sirkel?",["Rooi","Blou","Groen","Geel"],1,"Die tweede sirkel is blou.",{p:"kleur"}),
 MATCH("woord","Pas die Afrikaanse woord by die Engelse woord.",[["water","water"],["melk","milk"],["brood","bread"],["appel","apple"]],"Hierdie woorde lyk baie na die Engelse woorde."),
 MATCH("woord","Pas die dae.",[["Maandag","Monday"],["Woensdag","Wednesday"],["Vrydag","Friday"],["Sondag","Sunday"]],"Leer die dae van die week."),
 MC("woord","Watter woord beteken “mother”?",["Pa","Ma","Oupa","Boetie"],1,"Ma = mother."),
 MC("woord","Wat is “een, twee, drie” in Engels?",["One, two, three","Four, five, six","Six, seven, eight","Ten, nine, eight"],0,"Een = one, twee = two, drie = three."),
 NUM("woord","Watter getal is “vyf”?",5,"Vyf = 5."),
 NUM("woord","Watter getal is “tien”?",10,"Tien = 10."),
 MC("taal","Kies die regte voorsetsel: Die muis hardloop ___ die pad.",["deur","oor","onder","by"],1,"Die muis hardloop oor die pad."),
 MC("taal","Kies die regte voorsetsel: Die voël sit ___ die boom.",["in","na","teen","oor"],0,"Die voël sit in die boom."),
 MC("taal","Kies die regte voorsetsel: Mollie Muis kyk ___ die blitse.",["aan","na","in","op"],1,"Ons sê: kyk na."),
 MC("taal","Watter sin is korrek geskryf?",["die kat slaap.","Die kat slaap.","Die kat slaap","die Kat Slaap"],1,"Hoofletter voor en punt agter."),
 MC("taal","Watter sin is ’n vraag?",["Ek is lief vir ’n hond.","Waar is my skoen?","Maak die deur toe.","Dit reën."],1,"Dit eindig met ’n vraagteken."),
 MC("taal","Kies die regte woord: Ek ___ lief vir my ma.",["is","het","gaan","kom"],0,"Ek is lief vir my ma."),
 MC("taal","Kies die regte woord: Die kinders ___ in die tuin.",["speel","speelt","gespeel","speelde"],0,"Met “die kinders” sê ons “speel”."),
 TX("taal","Skryf die sin oor met hoofletters en ’n punt: ek hou van skool",["Ek hou van skool.","Ek hou van skool"],"Begin met ’n hoofletter en eindig met ’n punt.",{kw:["Ek hou van skool"],need:1,show:"Ek hou van skool."})
]});})();
