(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[1755],{46946:function(t){"use strict";var e={single_source_shortest_paths:function(t,o,i){var r,n,a,l,s,c,d,u={},h={};h[o]=0;var p=e.PriorityQueue.make();for(p.push(o,0);!p.empty();)for(a in n=(r=p.pop()).value,l=r.cost,s=t[n]||{})s.hasOwnProperty(a)&&(c=l+s[a],d=h[a],(void 0===h[a]||d>c)&&(h[a]=c,p.push(a,c),u[a]=n));if(void 0!==i&&void 0===h[i])throw Error(["Could not find a path from ",o," to ",i,"."].join(""));return u},extract_shortest_path_from_predecessor_list:function(t,e){for(var o=[],i=e;i;)o.push(i),t[i],i=t[i];return o.reverse(),o},find_path:function(t,o,i){var r=e.single_source_shortest_paths(t,o,i);return e.extract_shortest_path_from_predecessor_list(r,i)},PriorityQueue:{make:function(t){var o,i=e.PriorityQueue,r={};for(o in t=t||{},i)i.hasOwnProperty(o)&&(r[o]=i[o]);return r.queue=[],r.sorter=t.sorter||i.default_sorter,r},default_sorter:function(t,e){return t.cost-e.cost},push:function(t,e){this.queue.push({value:t,cost:e}),this.queue.sort(this.sorter)},pop:function(){return this.queue.shift()},empty:function(){return 0===this.queue.length}}};t.exports=e},8878:function(t){"use strict";t.exports=function(t){for(var e=[],o=t.length,i=0;i<o;i++){var r=t.charCodeAt(i);if(r>=55296&&r<=56319&&o>i+1){var n=t.charCodeAt(i+1);n>=56320&&n<=57343&&(r=(r-55296)*1024+n-56320+65536,i+=1)}if(r<128){e.push(r);continue}if(r<2048){e.push(r>>6|192),e.push(63&r|128);continue}if(r<55296||r>=57344&&r<65536){e.push(r>>12|224),e.push(r>>6&63|128),e.push(63&r|128);continue}if(r>=65536&&r<=1114111){e.push(r>>18|240),e.push(r>>12&63|128),e.push(r>>6&63|128),e.push(63&r|128);continue}e.push(239,191,189)}return new Uint8Array(e).buffer}},35819:function(t,e,o){let i=o(64888),r=o(82216),n=o(962),a=o(35623);function l(t,e,o,n,a){let l=[].slice.call(arguments,1),s=l.length,c="function"==typeof l[s-1];if(!c&&!i())throw Error("Callback required as last argument");if(c){if(s<2)throw Error("Too few arguments provided");2===s?(a=o,o=e,e=n=void 0):3===s&&(e.getContext&&void 0===a?(a=n,n=void 0):(a=n,n=o,o=e,e=void 0))}else{if(s<1)throw Error("Too few arguments provided");return 1===s?(o=e,e=n=void 0):2!==s||e.getContext||(n=o,o=e,e=void 0),new Promise(function(i,a){try{let a=r.create(o,n);i(t(a,e,n))}catch(t){a(t)}})}try{let i=r.create(o,n);a(null,t(i,e,n))}catch(t){a(t)}}e.create=r.create,e.toCanvas=l.bind(null,n.render),e.toDataURL=l.bind(null,n.renderToDataURL),e.toString=l.bind(null,function(t,e,o){return a.render(t,o)})},64888:function(t){t.exports=function(){return"function"==typeof Promise&&Promise.prototype&&Promise.prototype.then}},14691:function(t,e,o){let i=o(62415).getSymbolSize;e.getRowColCoords=function(t){if(1===t)return[];let e=Math.floor(t/7)+2,o=i(t),r=145===o?26:2*Math.ceil((o-13)/(2*e-2)),n=[o-7];for(let t=1;t<e-1;t++)n[t]=n[t-1]-r;return n.push(6),n.reverse()},e.getPositions=function(t){let o=[],i=e.getRowColCoords(t),r=i.length;for(let t=0;t<r;t++)for(let e=0;e<r;e++)(0!==t||0!==e)&&(0!==t||e!==r-1)&&(t!==r-1||0!==e)&&o.push([i[t],i[e]]);return o}},87111:function(t,e,o){let i=o(17956),r=["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"," ","$","%","*","+","-",".","/",":"];function n(t){this.mode=i.ALPHANUMERIC,this.data=t}n.getBitsLength=function(t){return 11*Math.floor(t/2)+t%2*6},n.prototype.getLength=function(){return this.data.length},n.prototype.getBitsLength=function(){return n.getBitsLength(this.data.length)},n.prototype.write=function(t){let e;for(e=0;e+2<=this.data.length;e+=2){let o=45*r.indexOf(this.data[e]);o+=r.indexOf(this.data[e+1]),t.put(o,11)}this.data.length%2&&t.put(r.indexOf(this.data[e]),6)},t.exports=n},9298:function(t){function e(){this.buffer=[],this.length=0}e.prototype={get:function(t){return(this.buffer[Math.floor(t/8)]>>>7-t%8&1)==1},put:function(t,e){for(let o=0;o<e;o++)this.putBit((t>>>e-o-1&1)==1)},getLengthInBits:function(){return this.length},putBit:function(t){let e=Math.floor(this.length/8);this.buffer.length<=e&&this.buffer.push(0),t&&(this.buffer[e]|=128>>>this.length%8),this.length++}},t.exports=e},55526:function(t){function e(t){if(!t||t<1)throw Error("BitMatrix size must be defined and greater than 0");this.size=t,this.data=new Uint8Array(t*t),this.reservedBit=new Uint8Array(t*t)}e.prototype.set=function(t,e,o,i){let r=t*this.size+e;this.data[r]=o,i&&(this.reservedBit[r]=!0)},e.prototype.get=function(t,e){return this.data[t*this.size+e]},e.prototype.xor=function(t,e,o){this.data[t*this.size+e]^=o},e.prototype.isReserved=function(t,e){return this.reservedBit[t*this.size+e]},t.exports=e},48153:function(t,e,o){let i=o(8878),r=o(17956);function n(t){this.mode=r.BYTE,"string"==typeof t&&(t=i(t)),this.data=new Uint8Array(t)}n.getBitsLength=function(t){return 8*t},n.prototype.getLength=function(){return this.data.length},n.prototype.getBitsLength=function(){return n.getBitsLength(this.data.length)},n.prototype.write=function(t){for(let e=0,o=this.data.length;e<o;e++)t.put(this.data[e],8)},t.exports=n},79386:function(t,e,o){let i=o(29947),r=[1,1,1,1,1,1,1,1,1,1,2,2,1,2,2,4,1,2,4,4,2,4,4,4,2,4,6,5,2,4,6,6,2,5,8,8,4,5,8,8,4,5,8,11,4,8,10,11,4,9,12,16,4,9,16,16,6,10,12,18,6,10,17,16,6,11,16,19,6,13,18,21,7,14,21,25,8,16,20,25,8,17,23,25,9,17,23,34,9,18,25,30,10,20,27,32,12,21,29,35,12,23,34,37,12,25,34,40,13,26,35,42,14,28,38,45,15,29,40,48,16,31,43,51,17,33,45,54,18,35,48,57,19,37,51,60,19,38,53,63,20,40,56,66,21,43,59,70,22,45,62,74,24,47,65,77,25,49,68,81],n=[7,10,13,17,10,16,22,28,15,26,36,44,20,36,52,64,26,48,72,88,36,64,96,112,40,72,108,130,48,88,132,156,60,110,160,192,72,130,192,224,80,150,224,264,96,176,260,308,104,198,288,352,120,216,320,384,132,240,360,432,144,280,408,480,168,308,448,532,180,338,504,588,196,364,546,650,224,416,600,700,224,442,644,750,252,476,690,816,270,504,750,900,300,560,810,960,312,588,870,1050,336,644,952,1110,360,700,1020,1200,390,728,1050,1260,420,784,1140,1350,450,812,1200,1440,480,868,1290,1530,510,924,1350,1620,540,980,1440,1710,570,1036,1530,1800,570,1064,1590,1890,600,1120,1680,1980,630,1204,1770,2100,660,1260,1860,2220,720,1316,1950,2310,750,1372,2040,2430];e.getBlocksCount=function(t,e){switch(e){case i.L:return r[(t-1)*4+0];case i.M:return r[(t-1)*4+1];case i.Q:return r[(t-1)*4+2];case i.H:return r[(t-1)*4+3];default:return}},e.getTotalCodewordsCount=function(t,e){switch(e){case i.L:return n[(t-1)*4+0];case i.M:return n[(t-1)*4+1];case i.Q:return n[(t-1)*4+2];case i.H:return n[(t-1)*4+3];default:return}}},29947:function(t,e){e.L={bit:1},e.M={bit:0},e.Q={bit:3},e.H={bit:2},e.isValid=function(t){return t&&void 0!==t.bit&&t.bit>=0&&t.bit<4},e.from=function(t,o){if(e.isValid(t))return t;try{return function(t){if("string"!=typeof t)throw Error("Param is not a string");switch(t.toLowerCase()){case"l":case"low":return e.L;case"m":case"medium":return e.M;case"q":case"quartile":return e.Q;case"h":case"high":return e.H;default:throw Error("Unknown EC Level: "+t)}}(t)}catch(t){return o}}},44086:function(t,e,o){let i=o(62415).getSymbolSize;e.getPositions=function(t){let e=i(t);return[[0,0],[e-7,0],[0,e-7]]}},27433:function(t,e,o){let i=o(62415),r=i.getBCHDigit(1335);e.getEncodedBits=function(t,e){let o=t.bit<<3|e,n=o<<10;for(;i.getBCHDigit(n)-r>=0;)n^=1335<<i.getBCHDigit(n)-r;return(o<<10|n)^21522}},63384:function(t,e){let o=new Uint8Array(512),i=new Uint8Array(256);!function(){let t=1;for(let e=0;e<255;e++)o[e]=t,i[t]=e,256&(t<<=1)&&(t^=285);for(let t=255;t<512;t++)o[t]=o[t-255]}(),e.log=function(t){if(t<1)throw Error("log("+t+")");return i[t]},e.exp=function(t){return o[t]},e.mul=function(t,e){return 0===t||0===e?0:o[i[t]+i[e]]}},78514:function(t,e,o){let i=o(17956),r=o(62415);function n(t){this.mode=i.KANJI,this.data=t}n.getBitsLength=function(t){return 13*t},n.prototype.getLength=function(){return this.data.length},n.prototype.getBitsLength=function(){return n.getBitsLength(this.data.length)},n.prototype.write=function(t){let e;for(e=0;e<this.data.length;e++){let o=r.toSJIS(this.data[e]);if(o>=33088&&o<=40956)o-=33088;else if(o>=57408&&o<=60351)o-=49472;else throw Error("Invalid SJIS character: "+this.data[e]+"\nMake sure your charset is UTF-8");o=(o>>>8&255)*192+(255&o),t.put(o,13)}},t.exports=n},24483:function(t,e){e.Patterns={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7};let o={N1:3,N2:3,N3:40,N4:10};e.isValid=function(t){return null!=t&&""!==t&&!isNaN(t)&&t>=0&&t<=7},e.from=function(t){return e.isValid(t)?parseInt(t,10):void 0},e.getPenaltyN1=function(t){let e=t.size,i=0,r=0,n=0,a=null,l=null;for(let s=0;s<e;s++){r=n=0,a=l=null;for(let c=0;c<e;c++){let e=t.get(s,c);e===a?r++:(r>=5&&(i+=o.N1+(r-5)),a=e,r=1),(e=t.get(c,s))===l?n++:(n>=5&&(i+=o.N1+(n-5)),l=e,n=1)}r>=5&&(i+=o.N1+(r-5)),n>=5&&(i+=o.N1+(n-5))}return i},e.getPenaltyN2=function(t){let e=t.size,i=0;for(let o=0;o<e-1;o++)for(let r=0;r<e-1;r++){let e=t.get(o,r)+t.get(o,r+1)+t.get(o+1,r)+t.get(o+1,r+1);(4===e||0===e)&&i++}return i*o.N2},e.getPenaltyN3=function(t){let e=t.size,i=0,r=0,n=0;for(let o=0;o<e;o++){r=n=0;for(let a=0;a<e;a++)r=r<<1&2047|t.get(o,a),a>=10&&(1488===r||93===r)&&i++,n=n<<1&2047|t.get(a,o),a>=10&&(1488===n||93===n)&&i++}return i*o.N3},e.getPenaltyN4=function(t){let e=0,i=t.data.length;for(let o=0;o<i;o++)e+=t.data[o];return Math.abs(Math.ceil(100*e/i/5)-10)*o.N4},e.applyMask=function(t,o){let i=o.size;for(let r=0;r<i;r++)for(let n=0;n<i;n++)o.isReserved(n,r)||o.xor(n,r,function(t,o,i){switch(t){case e.Patterns.PATTERN000:return(o+i)%2==0;case e.Patterns.PATTERN001:return o%2==0;case e.Patterns.PATTERN010:return i%3==0;case e.Patterns.PATTERN011:return(o+i)%3==0;case e.Patterns.PATTERN100:return(Math.floor(o/2)+Math.floor(i/3))%2==0;case e.Patterns.PATTERN101:return o*i%2+o*i%3==0;case e.Patterns.PATTERN110:return(o*i%2+o*i%3)%2==0;case e.Patterns.PATTERN111:return(o*i%3+(o+i)%2)%2==0;default:throw Error("bad maskPattern:"+t)}}(t,n,r))},e.getBestMask=function(t,o){let i=Object.keys(e.Patterns).length,r=0,n=1/0;for(let a=0;a<i;a++){o(a),e.applyMask(a,t);let i=e.getPenaltyN1(t)+e.getPenaltyN2(t)+e.getPenaltyN3(t)+e.getPenaltyN4(t);e.applyMask(a,t),i<n&&(n=i,r=a)}return r}},17956:function(t,e,o){let i=o(96623),r=o(80581);e.NUMERIC={id:"Numeric",bit:1,ccBits:[10,12,14]},e.ALPHANUMERIC={id:"Alphanumeric",bit:2,ccBits:[9,11,13]},e.BYTE={id:"Byte",bit:4,ccBits:[8,16,16]},e.KANJI={id:"Kanji",bit:8,ccBits:[8,10,12]},e.MIXED={bit:-1},e.getCharCountIndicator=function(t,e){if(!t.ccBits)throw Error("Invalid mode: "+t);if(!i.isValid(e))throw Error("Invalid version: "+e);return e>=1&&e<10?t.ccBits[0]:e<27?t.ccBits[1]:t.ccBits[2]},e.getBestModeForData=function(t){return r.testNumeric(t)?e.NUMERIC:r.testAlphanumeric(t)?e.ALPHANUMERIC:r.testKanji(t)?e.KANJI:e.BYTE},e.toString=function(t){if(t&&t.id)return t.id;throw Error("Invalid mode")},e.isValid=function(t){return t&&t.bit&&t.ccBits},e.from=function(t,o){if(e.isValid(t))return t;try{return function(t){if("string"!=typeof t)throw Error("Param is not a string");switch(t.toLowerCase()){case"numeric":return e.NUMERIC;case"alphanumeric":return e.ALPHANUMERIC;case"kanji":return e.KANJI;case"byte":return e.BYTE;default:throw Error("Unknown mode: "+t)}}(t)}catch(t){return o}}},51687:function(t,e,o){let i=o(17956);function r(t){this.mode=i.NUMERIC,this.data=t.toString()}r.getBitsLength=function(t){return 10*Math.floor(t/3)+(t%3?t%3*3+1:0)},r.prototype.getLength=function(){return this.data.length},r.prototype.getBitsLength=function(){return r.getBitsLength(this.data.length)},r.prototype.write=function(t){let e,o;for(e=0;e+3<=this.data.length;e+=3)o=parseInt(this.data.substr(e,3),10),t.put(o,10);let i=this.data.length-e;i>0&&(o=parseInt(this.data.substr(e),10),t.put(o,3*i+1))},t.exports=r},46413:function(t,e,o){let i=o(63384);e.mul=function(t,e){let o=new Uint8Array(t.length+e.length-1);for(let r=0;r<t.length;r++)for(let n=0;n<e.length;n++)o[r+n]^=i.mul(t[r],e[n]);return o},e.mod=function(t,e){let o=new Uint8Array(t);for(;o.length-e.length>=0;){let t=o[0];for(let r=0;r<e.length;r++)o[r]^=i.mul(e[r],t);let r=0;for(;r<o.length&&0===o[r];)r++;o=o.slice(r)}return o},e.generateECPolynomial=function(t){let o=new Uint8Array([1]);for(let r=0;r<t;r++)o=e.mul(o,new Uint8Array([1,i.exp(r)]));return o}},82216:function(t,e,o){let i=o(62415),r=o(29947),n=o(9298),a=o(55526),l=o(14691),s=o(44086),c=o(24483),d=o(79386),u=o(24011),h=o(33379),p=o(27433),g=o(17956),w=o(89940);function f(t,e,o){let i,r;let n=t.size,a=p.getEncodedBits(e,o);for(i=0;i<15;i++)r=(a>>i&1)==1,i<6?t.set(i,8,r,!0):i<8?t.set(i+1,8,r,!0):t.set(n-15+i,8,r,!0),i<8?t.set(8,n-i-1,r,!0):i<9?t.set(8,15-i-1+1,r,!0):t.set(8,15-i-1,r,!0);t.set(n-8,8,1,!0)}e.create=function(t,e){let o,p;if(void 0===t||""===t)throw Error("No input text");let b=r.M;return void 0!==e&&(b=r.from(e.errorCorrectionLevel,r.M),o=h.from(e.version),p=c.from(e.maskPattern),e.toSJISFunc&&i.setToSJISFunction(e.toSJISFunc)),function(t,e,o,r){let p;if(Array.isArray(t))p=w.fromArray(t);else if("string"==typeof t){let i=e;if(!i){let e=w.rawSplit(t);i=h.getBestVersionForData(e,o)}p=w.fromString(t,i||40)}else throw Error("Invalid data");let b=h.getBestVersionForData(p,o);if(!b)throw Error("The amount of data is too big to be stored in a QR Code");if(e){if(e<b)throw Error("\nThe chosen QR Code version cannot contain this amount of data.\nMinimum version required to store current data is: "+b+".\n")}else e=b;let v=function(t,e,o){let r=new n;o.forEach(function(e){r.put(e.mode.bit,4),r.put(e.getLength(),g.getCharCountIndicator(e.mode,t)),e.write(r)});let a=(i.getSymbolTotalCodewords(t)-d.getTotalCodewordsCount(t,e))*8;for(r.getLengthInBits()+4<=a&&r.put(0,4);r.getLengthInBits()%8!=0;)r.putBit(0);let l=(a-r.getLengthInBits())/8;for(let t=0;t<l;t++)r.put(t%2?17:236,8);return function(t,e,o){let r,n;let a=i.getSymbolTotalCodewords(e),l=a-d.getTotalCodewordsCount(e,o),s=d.getBlocksCount(e,o),c=a%s,h=s-c,p=Math.floor(a/s),g=Math.floor(l/s),w=g+1,f=p-g,b=new u(f),v=0,m=Array(s),y=Array(s),x=0,C=new Uint8Array(t.buffer);for(let t=0;t<s;t++){let e=t<h?g:w;m[t]=C.slice(v,v+e),y[t]=b.encode(m[t]),v+=e,x=Math.max(x,e)}let $=new Uint8Array(a),k=0;for(r=0;r<x;r++)for(n=0;n<s;n++)r<m[n].length&&($[k++]=m[n][r]);for(r=0;r<f;r++)for(n=0;n<s;n++)$[k++]=y[n][r];return $}(r,t,e)}(e,o,p),m=new a(i.getSymbolSize(e));return function(t,e){let o=t.size,i=s.getPositions(e);for(let e=0;e<i.length;e++){let r=i[e][0],n=i[e][1];for(let e=-1;e<=7;e++)if(!(r+e<=-1)&&!(o<=r+e))for(let i=-1;i<=7;i++)n+i<=-1||o<=n+i||(e>=0&&e<=6&&(0===i||6===i)||i>=0&&i<=6&&(0===e||6===e)||e>=2&&e<=4&&i>=2&&i<=4?t.set(r+e,n+i,!0,!0):t.set(r+e,n+i,!1,!0))}}(m,e),function(t){let e=t.size;for(let o=8;o<e-8;o++){let e=o%2==0;t.set(o,6,e,!0),t.set(6,o,e,!0)}}(m),function(t,e){let o=l.getPositions(e);for(let e=0;e<o.length;e++){let i=o[e][0],r=o[e][1];for(let e=-2;e<=2;e++)for(let o=-2;o<=2;o++)-2===e||2===e||-2===o||2===o||0===e&&0===o?t.set(i+e,r+o,!0,!0):t.set(i+e,r+o,!1,!0)}}(m,e),f(m,o,0),e>=7&&function(t,e){let o,i,r;let n=t.size,a=h.getEncodedBits(e);for(let e=0;e<18;e++)o=Math.floor(e/3),i=e%3+n-8-3,r=(a>>e&1)==1,t.set(o,i,r,!0),t.set(i,o,r,!0)}(m,e),function(t,e){let o=t.size,i=-1,r=o-1,n=7,a=0;for(let l=o-1;l>0;l-=2)for(6===l&&l--;;){for(let o=0;o<2;o++)if(!t.isReserved(r,l-o)){let i=!1;a<e.length&&(i=(e[a]>>>n&1)==1),t.set(r,l-o,i),-1==--n&&(a++,n=7)}if((r+=i)<0||o<=r){r-=i,i=-i;break}}}(m,v),isNaN(r)&&(r=c.getBestMask(m,f.bind(null,m,o))),c.applyMask(r,m),f(m,o,r),{modules:m,version:e,errorCorrectionLevel:o,maskPattern:r,segments:p}}(t,o,b,p)}},24011:function(t,e,o){let i=o(46413);function r(t){this.genPoly=void 0,this.degree=t,this.degree&&this.initialize(this.degree)}r.prototype.initialize=function(t){this.degree=t,this.genPoly=i.generateECPolynomial(this.degree)},r.prototype.encode=function(t){if(!this.genPoly)throw Error("Encoder not initialized");let e=new Uint8Array(t.length+this.degree);e.set(t);let o=i.mod(e,this.genPoly),r=this.degree-o.length;if(r>0){let t=new Uint8Array(this.degree);return t.set(o,r),t}return o},t.exports=r},80581:function(t,e){let o="[0-9]+",i="(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+",r="(?:(?![A-Z0-9 $%*+\\-./:]|"+(i=i.replace(/u/g,"\\u"))+")(?:.|[\r\n]))+";e.KANJI=RegExp(i,"g"),e.BYTE_KANJI=RegExp("[^A-Z0-9 $%*+\\-./:]+","g"),e.BYTE=RegExp(r,"g"),e.NUMERIC=RegExp(o,"g"),e.ALPHANUMERIC=RegExp("[A-Z $%*+\\-./:]+","g");let n=RegExp("^"+i+"$"),a=RegExp("^"+o+"$"),l=RegExp("^[A-Z0-9 $%*+\\-./:]+$");e.testKanji=function(t){return n.test(t)},e.testNumeric=function(t){return a.test(t)},e.testAlphanumeric=function(t){return l.test(t)}},89940:function(t,e,o){let i=o(17956),r=o(51687),n=o(87111),a=o(48153),l=o(78514),s=o(80581),c=o(62415),d=o(46946);function u(t){return unescape(encodeURIComponent(t)).length}function h(t,e,o){let i;let r=[];for(;null!==(i=t.exec(o));)r.push({data:i[0],index:i.index,mode:e,length:i[0].length});return r}function p(t){let e,o;let r=h(s.NUMERIC,i.NUMERIC,t),n=h(s.ALPHANUMERIC,i.ALPHANUMERIC,t);return c.isKanjiModeEnabled()?(e=h(s.BYTE,i.BYTE,t),o=h(s.KANJI,i.KANJI,t)):(e=h(s.BYTE_KANJI,i.BYTE,t),o=[]),r.concat(n,e,o).sort(function(t,e){return t.index-e.index}).map(function(t){return{data:t.data,mode:t.mode,length:t.length}})}function g(t,e){switch(e){case i.NUMERIC:return r.getBitsLength(t);case i.ALPHANUMERIC:return n.getBitsLength(t);case i.KANJI:return l.getBitsLength(t);case i.BYTE:return a.getBitsLength(t)}}function w(t,e){let o;let s=i.getBestModeForData(t);if((o=i.from(e,s))!==i.BYTE&&o.bit<s.bit)throw Error('"'+t+'" cannot be encoded with mode '+i.toString(o)+".\n Suggested mode is: "+i.toString(s));switch(o!==i.KANJI||c.isKanjiModeEnabled()||(o=i.BYTE),o){case i.NUMERIC:return new r(t);case i.ALPHANUMERIC:return new n(t);case i.KANJI:return new l(t);case i.BYTE:return new a(t)}}e.fromArray=function(t){return t.reduce(function(t,e){return"string"==typeof e?t.push(w(e,null)):e.data&&t.push(w(e.data,e.mode)),t},[])},e.fromString=function(t,o){let r=function(t,e){let o={},r={start:{}},n=["start"];for(let a=0;a<t.length;a++){let l=t[a],s=[];for(let t=0;t<l.length;t++){let c=l[t],d=""+a+t;s.push(d),o[d]={node:c,lastCount:0},r[d]={};for(let t=0;t<n.length;t++){let a=n[t];o[a]&&o[a].node.mode===c.mode?(r[a][d]=g(o[a].lastCount+c.length,c.mode)-g(o[a].lastCount,c.mode),o[a].lastCount+=c.length):(o[a]&&(o[a].lastCount=c.length),r[a][d]=g(c.length,c.mode)+4+i.getCharCountIndicator(c.mode,e))}}n=s}for(let t=0;t<n.length;t++)r[n[t]].end=0;return{map:r,table:o}}(function(t){let e=[];for(let o=0;o<t.length;o++){let r=t[o];switch(r.mode){case i.NUMERIC:e.push([r,{data:r.data,mode:i.ALPHANUMERIC,length:r.length},{data:r.data,mode:i.BYTE,length:r.length}]);break;case i.ALPHANUMERIC:e.push([r,{data:r.data,mode:i.BYTE,length:r.length}]);break;case i.KANJI:e.push([r,{data:r.data,mode:i.BYTE,length:u(r.data)}]);break;case i.BYTE:e.push([{data:r.data,mode:i.BYTE,length:u(r.data)}])}}return e}(p(t,c.isKanjiModeEnabled())),o),n=d.find_path(r.map,"start","end"),a=[];for(let t=1;t<n.length-1;t++)a.push(r.table[n[t]].node);return e.fromArray(a.reduce(function(t,e){let o=t.length-1>=0?t[t.length-1]:null;return o&&o.mode===e.mode?t[t.length-1].data+=e.data:t.push(e),t},[]))},e.rawSplit=function(t){return e.fromArray(p(t,c.isKanjiModeEnabled()))}},62415:function(t,e){let o;let i=[0,26,44,70,100,134,172,196,242,292,346,404,466,532,581,655,733,815,901,991,1085,1156,1258,1364,1474,1588,1706,1828,1921,2051,2185,2323,2465,2611,2761,2876,3034,3196,3362,3532,3706];e.getSymbolSize=function(t){if(!t)throw Error('"version" cannot be null or undefined');if(t<1||t>40)throw Error('"version" should be in range from 1 to 40');return 4*t+17},e.getSymbolTotalCodewords=function(t){return i[t]},e.getBCHDigit=function(t){let e=0;for(;0!==t;)e++,t>>>=1;return e},e.setToSJISFunction=function(t){if("function"!=typeof t)throw Error('"toSJISFunc" is not a valid function.');o=t},e.isKanjiModeEnabled=function(){return void 0!==o},e.toSJIS=function(t){return o(t)}},96623:function(t,e){e.isValid=function(t){return!isNaN(t)&&t>=1&&t<=40}},33379:function(t,e,o){let i=o(62415),r=o(79386),n=o(29947),a=o(17956),l=o(96623),s=i.getBCHDigit(7973);function c(t,e){return a.getCharCountIndicator(t,e)+4}e.from=function(t,e){return l.isValid(t)?parseInt(t,10):e},e.getCapacity=function(t,e,o){if(!l.isValid(t))throw Error("Invalid QR Code version");void 0===o&&(o=a.BYTE);let n=(i.getSymbolTotalCodewords(t)-r.getTotalCodewordsCount(t,e))*8;if(o===a.MIXED)return n;let s=n-c(o,t);switch(o){case a.NUMERIC:return Math.floor(s/10*3);case a.ALPHANUMERIC:return Math.floor(s/11*2);case a.KANJI:return Math.floor(s/13);case a.BYTE:default:return Math.floor(s/8)}},e.getBestVersionForData=function(t,o){let i;let r=n.from(o,n.M);if(Array.isArray(t)){if(t.length>1)return function(t,o){for(let i=1;i<=40;i++)if(function(t,e){let o=0;return t.forEach(function(t){let i=c(t.mode,e);o+=i+t.getBitsLength()}),o}(t,i)<=e.getCapacity(i,o,a.MIXED))return i}(t,r);if(0===t.length)return 1;i=t[0]}else i=t;return function(t,o,i){for(let r=1;r<=40;r++)if(o<=e.getCapacity(r,i,t))return r}(i.mode,i.getLength(),r)},e.getEncodedBits=function(t){if(!l.isValid(t)||t<7)throw Error("Invalid QR Code version");let e=t<<12;for(;i.getBCHDigit(e)-s>=0;)e^=7973<<i.getBCHDigit(e)-s;return t<<12|e}},962:function(t,e,o){let i=o(87220);e.render=function(t,e,o){var r;let n=o,a=e;void 0!==n||e&&e.getContext||(n=e,e=void 0),e||(a=function(){try{return document.createElement("canvas")}catch(t){throw Error("You need to specify a canvas element")}}()),n=i.getOptions(n);let l=i.getImageWidth(t.modules.size,n),s=a.getContext("2d"),c=s.createImageData(l,l);return i.qrToImageData(c.data,t,n),r=a,s.clearRect(0,0,r.width,r.height),r.style||(r.style={}),r.height=l,r.width=l,r.style.height=l+"px",r.style.width=l+"px",s.putImageData(c,0,0),a},e.renderToDataURL=function(t,o,i){let r=i;void 0!==r||o&&o.getContext||(r=o,o=void 0),r||(r={});let n=e.render(t,o,r),a=r.type||"image/png",l=r.rendererOpts||{};return n.toDataURL(a,l.quality)}},35623:function(t,e,o){let i=o(87220);function r(t,e){let o=t.a/255,i=e+'="'+t.hex+'"';return o<1?i+" "+e+'-opacity="'+o.toFixed(2).slice(1)+'"':i}function n(t,e,o){let i=t+e;return void 0!==o&&(i+=" "+o),i}e.render=function(t,e,o){let a=i.getOptions(e),l=t.modules.size,s=t.modules.data,c=l+2*a.margin,d=a.color.light.a?"<path "+r(a.color.light,"fill")+' d="M0 0h'+c+"v"+c+'H0z"/>':"",u="<path "+r(a.color.dark,"stroke")+' d="'+function(t,e,o){let i="",r=0,a=!1,l=0;for(let s=0;s<t.length;s++){let c=Math.floor(s%e),d=Math.floor(s/e);c||a||(a=!0),t[s]?(l++,s>0&&c>0&&t[s-1]||(i+=a?n("M",c+o,.5+d+o):n("m",r,0),r=0,a=!1),c+1<e&&t[s+1]||(i+=n("h",l),l=0)):r++}return i}(s,l,a.margin)+'"/>',h='<svg xmlns="http://www.w3.org/2000/svg" '+(a.width?'width="'+a.width+'" height="'+a.width+'" ':"")+('viewBox="0 0 '+c)+" "+c+'" shape-rendering="crispEdges">'+d+u+"</svg>\n";return"function"==typeof o&&o(null,h),h}},87220:function(t,e){function o(t){if("number"==typeof t&&(t=t.toString()),"string"!=typeof t)throw Error("Color should be defined as hex string");let e=t.slice().replace("#","").split("");if(e.length<3||5===e.length||e.length>8)throw Error("Invalid hex color: "+t);(3===e.length||4===e.length)&&(e=Array.prototype.concat.apply([],e.map(function(t){return[t,t]}))),6===e.length&&e.push("F","F");let o=parseInt(e.join(""),16);return{r:o>>24&255,g:o>>16&255,b:o>>8&255,a:255&o,hex:"#"+e.slice(0,6).join("")}}e.getOptions=function(t){t||(t={}),t.color||(t.color={});let e=void 0===t.margin||null===t.margin||t.margin<0?4:t.margin,i=t.width&&t.width>=21?t.width:void 0,r=t.scale||4;return{width:i,scale:i?4:r,margin:e,color:{dark:o(t.color.dark||"#000000ff"),light:o(t.color.light||"#ffffffff")},type:t.type,rendererOpts:t.rendererOpts||{}}},e.getScale=function(t,e){return e.width&&e.width>=t+2*e.margin?e.width/(t+2*e.margin):e.scale},e.getImageWidth=function(t,o){let i=e.getScale(t,o);return Math.floor((t+2*o.margin)*i)},e.qrToImageData=function(t,o,i){let r=o.modules.size,n=o.modules.data,a=e.getScale(r,i),l=Math.floor((r+2*i.margin)*a),s=i.margin*a,c=[i.color.light,i.color.dark];for(let e=0;e<l;e++)for(let o=0;o<l;o++){let d=(e*l+o)*4,u=i.color.light;e>=s&&o>=s&&e<l-s&&o<l-s&&(u=c[n[Math.floor((e-s)/a)*r+Math.floor((o-s)/a)]?1:0]),t[d++]=u.r,t[d++]=u.g,t[d++]=u.b,t[d]=u.a}}},21755:function(t,e,o){"use strict";o.r(e),o.d(e,{W3mAllWalletsView:function(){return eL},W3mConnectingWcBasicView:function(){return t2},W3mDownloadsView:function(){return eN}});var i=o(31133),r=o(19848),n=o(53357),a=o(17766),l=o(48415),s=o(36801),c=o(30795);o(96277);var d=o(32801),u=o(35652),h=o(31929),p=o(86777);o(95137),o(18360),o(1736);var g=o(84249),w=o(57116);o(5680),o(23805);var f=(0,i.iv)`
  :host {
    position: relative;
    background-color: var(--wui-color-gray-glass-002);
    display: flex;
    justify-content: center;
    align-items: center;
    width: var(--local-size);
    height: var(--local-size);
    border-radius: inherit;
    border-radius: var(--local-border-radius);
  }

  :host > wui-flex {
    overflow: hidden;
    border-radius: inherit;
    border-radius: var(--local-border-radius);
  }

  :host::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    border-radius: inherit;
    border: 1px solid var(--wui-color-gray-glass-010);
    pointer-events: none;
  }

  :host([name='Extension'])::after {
    border: 1px solid var(--wui-color-accent-glass-010);
  }

  :host([data-wallet-icon='allWallets']) {
    background-color: var(--wui-all-wallets-bg-100);
  }

  :host([data-wallet-icon='allWallets'])::after {
    border: 1px solid var(--wui-color-accent-glass-010);
  }

  wui-icon[data-parent-size='inherit'] {
    width: 75%;
    height: 75%;
    align-items: center;
  }

  wui-icon[data-parent-size='sm'] {
    width: 18px;
    height: 18px;
  }

  wui-icon[data-parent-size='md'] {
    width: 24px;
    height: 24px;
  }

  wui-icon[data-parent-size='lg'] {
    width: 42px;
    height: 42px;
  }

  wui-icon[data-parent-size='full'] {
    width: 100%;
    height: 100%;
  }

  :host > wui-icon-box {
    position: absolute;
    overflow: hidden;
    right: -1px;
    bottom: -2px;
    z-index: 1;
    border: 2px solid var(--wui-color-bg-150, #1e1f1f);
    padding: 1px;
  }
`,b=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let v=class extends i.oi{constructor(){super(...arguments),this.size="md",this.name="",this.installed=!1,this.badgeSize="xs"}render(){let t="xxs";return t="lg"===this.size?"m":"md"===this.size?"xs":"xxs",this.style.cssText=`
       --local-border-radius: var(--wui-border-radius-${t});
       --local-size: var(--wui-wallet-image-size-${this.size});
   `,this.walletIcon&&(this.dataset.walletIcon=this.walletIcon),(0,i.dy)`
      <wui-flex justifyContent="center" alignItems="center"> ${this.templateVisual()} </wui-flex>
    `}templateVisual(){return this.imageSrc?(0,i.dy)`<wui-image src=${this.imageSrc} alt=${this.name}></wui-image>`:this.walletIcon?(0,i.dy)`<wui-icon
        data-parent-size="md"
        size="md"
        color="inherit"
        name=${this.walletIcon}
      ></wui-icon>`:(0,i.dy)`<wui-icon
      data-parent-size=${this.size}
      size="inherit"
      color="inherit"
      name="walletPlaceholder"
    ></wui-icon>`}};v.styles=[g.ZM,g.ET,f],b([(0,r.Cb)()],v.prototype,"size",void 0),b([(0,r.Cb)()],v.prototype,"name",void 0),b([(0,r.Cb)()],v.prototype,"imageSrc",void 0),b([(0,r.Cb)()],v.prototype,"walletIcon",void 0),b([(0,r.Cb)({type:Boolean})],v.prototype,"installed",void 0),b([(0,r.Cb)()],v.prototype,"badgeSize",void 0),v=b([(0,w.M)("wui-wallet-image")],v);var m=(0,i.iv)`
  :host {
    position: relative;
    border-radius: var(--wui-border-radius-xxs);
    width: 40px;
    height: 40px;
    overflow: hidden;
    background: var(--wui-color-gray-glass-002);
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--wui-spacing-4xs);
    padding: 3.75px !important;
  }

  :host::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    border-radius: inherit;
    border: 1px solid var(--wui-color-gray-glass-010);
    pointer-events: none;
  }

  :host > wui-wallet-image {
    width: 14px;
    height: 14px;
    border-radius: var(--wui-border-radius-5xs);
  }

  :host > wui-flex {
    padding: 2px;
    position: fixed;
    overflow: hidden;
    left: 34px;
    bottom: 8px;
    background: var(--dark-background-150, #1e1f1f);
    border-radius: 50%;
    z-index: 2;
    display: flex;
  }
`,y=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let x=class extends i.oi{constructor(){super(...arguments),this.walletImages=[]}render(){let t=this.walletImages.length<4;return(0,i.dy)`${this.walletImages.slice(0,4).map(({src:t,walletName:e})=>(0,i.dy)`
            <wui-wallet-image
              size="inherit"
              imageSrc=${t}
              name=${(0,d.o)(e)}
            ></wui-wallet-image>
          `)}
      ${t?[...Array(4-this.walletImages.length)].map(()=>(0,i.dy)` <wui-wallet-image size="inherit" name=""></wui-wallet-image>`):null}
      <wui-flex>
        <wui-icon-box
          size="xxs"
          iconSize="xxs"
          iconcolor="success-100"
          backgroundcolor="success-100"
          icon="checkmark"
          background="opaque"
        ></wui-icon-box>
      </wui-flex>`}};x.styles=[g.ET,m],y([(0,r.Cb)({type:Array})],x.prototype,"walletImages",void 0),x=y([(0,w.M)("wui-all-wallets-image")],x),o(80675);var C=(0,i.iv)`
  button {
    column-gap: var(--wui-spacing-s);
    padding: 7px var(--wui-spacing-l) 7px var(--wui-spacing-xs);
    width: 100%;
    background-color: var(--wui-color-gray-glass-002);
    border-radius: var(--wui-border-radius-xs);
    color: var(--wui-color-fg-100);
  }

  button > wui-text:nth-child(2) {
    display: flex;
    flex: 1;
  }

  button:disabled {
    background-color: var(--wui-color-gray-glass-015);
    color: var(--wui-color-gray-glass-015);
  }

  button:disabled > wui-tag {
    background-color: var(--wui-color-gray-glass-010);
    color: var(--wui-color-fg-300);
  }

  wui-icon {
    color: var(--wui-color-fg-200) !important;
  }
`,$=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let k=class extends i.oi{constructor(){super(...arguments),this.walletImages=[],this.imageSrc="",this.name="",this.tabIdx=void 0,this.installed=!1,this.disabled=!1,this.showAllWallets=!1,this.loading=!1,this.loadingSpinnerColor="accent-100"}render(){return(0,i.dy)`
      <button ?disabled=${this.disabled} tabindex=${(0,d.o)(this.tabIdx)}>
        ${this.templateAllWallets()} ${this.templateWalletImage()}
        <wui-text variant="paragraph-500" color="inherit">${this.name}</wui-text>
        ${this.templateStatus()}
      </button>
    `}templateAllWallets(){return this.showAllWallets&&this.imageSrc?(0,i.dy)` <wui-all-wallets-image .imageeSrc=${this.imageSrc}> </wui-all-wallets-image> `:this.showAllWallets&&this.walletIcon?(0,i.dy)` <wui-wallet-image .walletIcon=${this.walletIcon} size="sm"> </wui-wallet-image> `:null}templateWalletImage(){return!this.showAllWallets&&this.imageSrc?(0,i.dy)`<wui-wallet-image
        size="sm"
        imageSrc=${this.imageSrc}
        name=${this.name}
        .installed=${this.installed}
      ></wui-wallet-image>`:this.showAllWallets||this.imageSrc?null:(0,i.dy)`<wui-wallet-image size="sm" name=${this.name}></wui-wallet-image>`}templateStatus(){return this.loading?(0,i.dy)`<wui-loading-spinner
        size="lg"
        color=${this.loadingSpinnerColor}
      ></wui-loading-spinner>`:this.tagLabel&&this.tagVariant?(0,i.dy)`<wui-tag variant=${this.tagVariant}>${this.tagLabel}</wui-tag>`:this.icon?(0,i.dy)`<wui-icon color="inherit" size="sm" name=${this.icon}></wui-icon>`:null}};k.styles=[g.ET,g.ZM,C],$([(0,r.Cb)({type:Array})],k.prototype,"walletImages",void 0),$([(0,r.Cb)()],k.prototype,"imageSrc",void 0),$([(0,r.Cb)()],k.prototype,"name",void 0),$([(0,r.Cb)()],k.prototype,"tagLabel",void 0),$([(0,r.Cb)()],k.prototype,"tagVariant",void 0),$([(0,r.Cb)()],k.prototype,"icon",void 0),$([(0,r.Cb)()],k.prototype,"walletIcon",void 0),$([(0,r.Cb)()],k.prototype,"tabIdx",void 0),$([(0,r.Cb)({type:Boolean})],k.prototype,"installed",void 0),$([(0,r.Cb)({type:Boolean})],k.prototype,"disabled",void 0),$([(0,r.Cb)({type:Boolean})],k.prototype,"showAllWallets",void 0),$([(0,r.Cb)({type:Boolean})],k.prototype,"loading",void 0),$([(0,r.Cb)({type:String})],k.prototype,"loadingSpinnerColor",void 0),k=$([(0,w.M)("wui-list-wallet")],k);var R=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let E=class extends i.oi{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=u.ConnectorController.state.connectors,this.count=a.ApiController.state.count,this.filteredCount=a.ApiController.state.filteredWallets.length,this.isFetchingRecommendedWallets=a.ApiController.state.isFetchingRecommendedWallets,this.unsubscribe.push(u.ConnectorController.subscribeKey("connectors",t=>this.connectors=t),a.ApiController.subscribeKey("count",t=>this.count=t),a.ApiController.subscribeKey("filteredWallets",t=>this.filteredCount=t.length),a.ApiController.subscribeKey("isFetchingRecommendedWallets",t=>this.isFetchingRecommendedWallets=t))}disconnectedCallback(){this.unsubscribe.forEach(t=>t())}render(){let t=this.connectors.find(t=>"walletConnect"===t.id),{allWallets:e}=l.OptionsController.state;if(!t||"HIDE"===e||"ONLY_MOBILE"===e&&!n.j.isMobile())return null;let o=a.ApiController.state.featured.length,r=this.count+o,s=this.filteredCount>0?this.filteredCount:r<10?r:10*Math.floor(r/10),c=`${s}`;return this.filteredCount>0?c=`${this.filteredCount}`:s<r&&(c=`${s}+`),(0,i.dy)`
      <wui-list-wallet
        name="All Wallets"
        walletIcon="allWallets"
        showAllWallets
        @click=${this.onAllWallets.bind(this)}
        tagLabel=${c}
        tagVariant="shade"
        data-testid="all-wallets"
        tabIdx=${(0,d.o)(this.tabIdx)}
        .loading=${this.isFetchingRecommendedWallets}
        loadingSpinnerColor=${this.isFetchingRecommendedWallets?"fg-300":"accent-100"}
      ></wui-list-wallet>
    `}onAllWallets(){h.X.sendEvent({type:"track",event:"CLICK_ALL_WALLETS"}),p.RouterController.push("AllWallets")}};R([(0,r.Cb)()],E.prototype,"tabIdx",void 0),R([(0,r.SB)()],E.prototype,"connectors",void 0),R([(0,r.SB)()],E.prototype,"count",void 0),R([(0,r.SB)()],E.prototype,"filteredCount",void 0),R([(0,r.SB)()],E.prototype,"isFetchingRecommendedWallets",void 0),E=R([(0,c.Mo)("w3m-all-wallets-widget")],E);var I=o(63043),S=o(46773),T=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let j=class extends i.oi{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=u.ConnectorController.state.connectors,this.unsubscribe.push(u.ConnectorController.subscribeKey("connectors",t=>this.connectors=t))}disconnectedCallback(){this.unsubscribe.forEach(t=>t())}render(){let t=this.connectors.filter(t=>"ANNOUNCED"===t.type);return t?.length?(0,i.dy)`
      <wui-flex flexDirection="column" gap="xs">
        ${t.filter(S.C.showConnector).map(t=>(0,i.dy)`
              <wui-list-wallet
                imageSrc=${(0,d.o)(I.f.getConnectorImage(t))}
                name=${t.name??"Unknown"}
                @click=${()=>this.onConnector(t)}
                tagVariant="success"
                tagLabel="installed"
                data-testid=${`wallet-selector-${t.id}`}
                .installed=${!0}
                tabIdx=${(0,d.o)(this.tabIdx)}
              >
              </wui-list-wallet>
            `)}
      </wui-flex>
    `:(this.style.cssText="display: none",null)}onConnector(t){"walletConnect"===t.id?n.j.isMobile()?p.RouterController.push("AllWallets"):p.RouterController.push("ConnectingWalletConnect"):p.RouterController.push("ConnectingExternal",{connector:t})}};T([(0,r.Cb)()],j.prototype,"tabIdx",void 0),T([(0,r.SB)()],j.prototype,"connectors",void 0),j=T([(0,c.Mo)("w3m-connect-announced-widget")],j);var P=o(93046),O=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let B=class extends i.oi{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=u.ConnectorController.state.connectors,this.loading=!1,this.unsubscribe.push(u.ConnectorController.subscribeKey("connectors",t=>this.connectors=t)),n.j.isTelegram()&&n.j.isIos()&&(this.loading=!P.ConnectionController.state.wcUri,this.unsubscribe.push(P.ConnectionController.subscribeKey("wcUri",t=>this.loading=!t)))}disconnectedCallback(){this.unsubscribe.forEach(t=>t())}render(){let{customWallets:t}=l.OptionsController.state;if(!t?.length)return this.style.cssText="display: none",null;let e=this.filterOutDuplicateWallets(t);return(0,i.dy)`<wui-flex flexDirection="column" gap="xs">
      ${e.map(t=>(0,i.dy)`
          <wui-list-wallet
            imageSrc=${(0,d.o)(I.f.getWalletImage(t))}
            name=${t.name??"Unknown"}
            @click=${()=>this.onConnectWallet(t)}
            data-testid=${`wallet-selector-${t.id}`}
            tabIdx=${(0,d.o)(this.tabIdx)}
            ?loading=${this.loading}
          >
          </wui-list-wallet>
        `)}
    </wui-flex>`}filterOutDuplicateWallets(t){let e=s.M.getRecentWallets(),o=this.connectors.map(t=>t.info?.rdns).filter(Boolean),i=e.map(t=>t.rdns).filter(Boolean),r=o.concat(i);if(r.includes("io.metamask.mobile")&&n.j.isMobile()){let t=r.indexOf("io.metamask.mobile");r[t]="io.metamask"}return t.filter(t=>!r.includes(String(t?.rdns)))}onConnectWallet(t){this.loading||p.RouterController.push("ConnectingWalletConnect",{wallet:t})}};O([(0,r.Cb)()],B.prototype,"tabIdx",void 0),O([(0,r.SB)()],B.prototype,"connectors",void 0),O([(0,r.SB)()],B.prototype,"loading",void 0),B=O([(0,c.Mo)("w3m-connect-custom-widget")],B);var A=o(44649),L=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let M=class extends i.oi{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=u.ConnectorController.state.connectors,this.unsubscribe.push(u.ConnectorController.subscribeKey("connectors",t=>this.connectors=t))}disconnectedCallback(){this.unsubscribe.forEach(t=>t())}render(){let t=this.connectors.filter(t=>"EXTERNAL"===t.type).filter(S.C.showConnector).filter(t=>t.id!==A.b.CONNECTOR_ID.COINBASE_SDK);return t?.length?(0,i.dy)`
      <wui-flex flexDirection="column" gap="xs">
        ${t.map(t=>(0,i.dy)`
            <wui-list-wallet
              imageSrc=${(0,d.o)(I.f.getConnectorImage(t))}
              .installed=${!0}
              name=${t.name??"Unknown"}
              data-testid=${`wallet-selector-external-${t.id}`}
              @click=${()=>this.onConnector(t)}
              tabIdx=${(0,d.o)(this.tabIdx)}
            >
            </wui-list-wallet>
          `)}
      </wui-flex>
    `:(this.style.cssText="display: none",null)}onConnector(t){p.RouterController.push("ConnectingExternal",{connector:t})}};L([(0,r.Cb)()],M.prototype,"tabIdx",void 0),L([(0,r.SB)()],M.prototype,"connectors",void 0),M=L([(0,c.Mo)("w3m-connect-external-widget")],M);var z=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let W=class extends i.oi{constructor(){super(...arguments),this.tabIdx=void 0,this.wallets=[]}render(){return this.wallets.length?(0,i.dy)`
      <wui-flex flexDirection="column" gap="xs">
        ${this.wallets.map(t=>(0,i.dy)`
            <wui-list-wallet
              data-testid=${`wallet-selector-featured-${t.id}`}
              imageSrc=${(0,d.o)(I.f.getWalletImage(t))}
              name=${t.name??"Unknown"}
              @click=${()=>this.onConnectWallet(t)}
              tabIdx=${(0,d.o)(this.tabIdx)}
            >
            </wui-list-wallet>
          `)}
      </wui-flex>
    `:(this.style.cssText="display: none",null)}onConnectWallet(t){u.ConnectorController.selectWalletConnector(t)}};z([(0,r.Cb)()],W.prototype,"tabIdx",void 0),z([(0,r.Cb)()],W.prototype,"wallets",void 0),W=z([(0,c.Mo)("w3m-connect-featured-widget")],W);var N=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let D=class extends i.oi{constructor(){super(...arguments),this.tabIdx=void 0,this.connectors=[]}render(){let t=this.connectors.filter(S.C.showConnector);return 0===t.length?(this.style.cssText="display: none",null):(0,i.dy)`
      <wui-flex flexDirection="column" gap="xs">
        ${t.map(t=>(0,i.dy)`
            <wui-list-wallet
              imageSrc=${(0,d.o)(I.f.getConnectorImage(t))}
              .installed=${!0}
              name=${t.name??"Unknown"}
              tagVariant="success"
              tagLabel="installed"
              data-testid=${`wallet-selector-${t.id}`}
              @click=${()=>this.onConnector(t)}
              tabIdx=${(0,d.o)(this.tabIdx)}
            >
            </wui-list-wallet>
          `)}
      </wui-flex>
    `}onConnector(t){u.ConnectorController.setActiveConnector(t),p.RouterController.push("ConnectingExternal",{connector:t})}};N([(0,r.Cb)()],D.prototype,"tabIdx",void 0),N([(0,r.Cb)()],D.prototype,"connectors",void 0),D=N([(0,c.Mo)("w3m-connect-injected-widget")],D);var U=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let _=class extends i.oi{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=u.ConnectorController.state.connectors,this.unsubscribe.push(u.ConnectorController.subscribeKey("connectors",t=>this.connectors=t))}disconnectedCallback(){this.unsubscribe.forEach(t=>t())}render(){let t=this.connectors.filter(t=>"MULTI_CHAIN"===t.type&&"WalletConnect"!==t.name);return t?.length?(0,i.dy)`
      <wui-flex flexDirection="column" gap="xs">
        ${t.map(t=>(0,i.dy)`
            <wui-list-wallet
              imageSrc=${(0,d.o)(I.f.getConnectorImage(t))}
              .installed=${!0}
              name=${t.name??"Unknown"}
              tagVariant="shade"
              tagLabel="multichain"
              data-testid=${`wallet-selector-${t.id}`}
              @click=${()=>this.onConnector(t)}
              tabIdx=${(0,d.o)(this.tabIdx)}
            >
            </wui-list-wallet>
          `)}
      </wui-flex>
    `:(this.style.cssText="display: none",null)}onConnector(t){u.ConnectorController.setActiveConnector(t),p.RouterController.push("ConnectingMultiChain")}};U([(0,r.Cb)()],_.prototype,"tabIdx",void 0),U([(0,r.SB)()],_.prototype,"connectors",void 0),_=U([(0,c.Mo)("w3m-connect-multi-chain-widget")],_);var q=o(6943),H=o(70768),K=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let V=class extends i.oi{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=u.ConnectorController.state.connectors,this.loading=!1,this.unsubscribe.push(u.ConnectorController.subscribeKey("connectors",t=>this.connectors=t)),n.j.isTelegram()&&n.j.isIos()&&(this.loading=!P.ConnectionController.state.wcUri,this.unsubscribe.push(P.ConnectionController.subscribeKey("wcUri",t=>this.loading=!t)))}render(){let t=s.M.getRecentWallets().filter(t=>!H.J.isExcluded(t)).filter(t=>!this.hasWalletConnector(t)).filter(t=>this.isWalletCompatibleWithCurrentChain(t));return t.length?(0,i.dy)`
      <wui-flex flexDirection="column" gap="xs">
        ${t.map(t=>(0,i.dy)`
            <wui-list-wallet
              imageSrc=${(0,d.o)(I.f.getWalletImage(t))}
              name=${t.name??"Unknown"}
              @click=${()=>this.onConnectWallet(t)}
              tagLabel="recent"
              tagVariant="shade"
              tabIdx=${(0,d.o)(this.tabIdx)}
              ?loading=${this.loading}
            >
            </wui-list-wallet>
          `)}
      </wui-flex>
    `:(this.style.cssText="display: none",null)}onConnectWallet(t){this.loading||u.ConnectorController.selectWalletConnector(t)}hasWalletConnector(t){return this.connectors.some(e=>e.id===t.id||e.name===t.name)}isWalletCompatibleWithCurrentChain(t){let e=q.R.state.activeChain;return!e||!t.chains||t.chains.some(t=>e===t.split(":")[0])}};K([(0,r.Cb)()],V.prototype,"tabIdx",void 0),K([(0,r.SB)()],V.prototype,"connectors",void 0),K([(0,r.SB)()],V.prototype,"loading",void 0),V=K([(0,c.Mo)("w3m-connect-recent-widget")],V);var F=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let Y=class extends i.oi{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.wallets=[],this.loading=!1,n.j.isTelegram()&&n.j.isIos()&&(this.loading=!P.ConnectionController.state.wcUri,this.unsubscribe.push(P.ConnectionController.subscribeKey("wcUri",t=>this.loading=!t)))}render(){let{connectors:t}=u.ConnectorController.state,{customWallets:e,featuredWalletIds:o}=l.OptionsController.state,r=s.M.getRecentWallets(),n=t.find(t=>"walletConnect"===t.id),a=t.filter(t=>"INJECTED"===t.type||"ANNOUNCED"===t.type||"MULTI_CHAIN"===t.type).filter(t=>"Browser Wallet"!==t.name);if(!n)return null;if(o||e||!this.wallets.length)return this.style.cssText="display: none",null;let c=a.length+r.length,h=H.J.filterOutDuplicateWallets(this.wallets).slice(0,Math.max(0,2-c));return h.length?(0,i.dy)`
      <wui-flex flexDirection="column" gap="xs">
        ${h.map(t=>(0,i.dy)`
            <wui-list-wallet
              imageSrc=${(0,d.o)(I.f.getWalletImage(t))}
              name=${t?.name??"Unknown"}
              @click=${()=>this.onConnectWallet(t)}
              tabIdx=${(0,d.o)(this.tabIdx)}
              ?loading=${this.loading}
            >
            </wui-list-wallet>
          `)}
      </wui-flex>
    `:(this.style.cssText="display: none",null)}onConnectWallet(t){if(this.loading)return;let e=u.ConnectorController.getConnector(t.id,t.rdns);e?p.RouterController.push("ConnectingExternal",{connector:e}):p.RouterController.push("ConnectingWalletConnect",{wallet:t})}};F([(0,r.Cb)()],Y.prototype,"tabIdx",void 0),F([(0,r.Cb)()],Y.prototype,"wallets",void 0),F([(0,r.SB)()],Y.prototype,"loading",void 0),Y=F([(0,c.Mo)("w3m-connect-recommended-widget")],Y);var J=o(22472),X=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let G=class extends i.oi{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=u.ConnectorController.state.connectors,this.connectorImages=J.W.state.connectorImages,this.unsubscribe.push(u.ConnectorController.subscribeKey("connectors",t=>this.connectors=t),J.W.subscribeKey("connectorImages",t=>this.connectorImages=t))}disconnectedCallback(){this.unsubscribe.forEach(t=>t())}render(){if(n.j.isMobile())return this.style.cssText="display: none",null;let t=this.connectors.find(t=>"walletConnect"===t.id);if(!t)return this.style.cssText="display: none",null;let e=t.imageUrl||this.connectorImages[t?.imageId??""];return(0,i.dy)`
      <wui-list-wallet
        imageSrc=${(0,d.o)(e)}
        name=${t.name??"Unknown"}
        @click=${()=>this.onConnector(t)}
        tagLabel="qr code"
        tagVariant="main"
        tabIdx=${(0,d.o)(this.tabIdx)}
        data-testid="wallet-selector-walletconnect"
      >
      </wui-list-wallet>
    `}onConnector(t){u.ConnectorController.setActiveConnector(t),p.RouterController.push("ConnectingWalletConnect")}};X([(0,r.Cb)()],G.prototype,"tabIdx",void 0),X([(0,r.SB)()],G.prototype,"connectors",void 0),X([(0,r.SB)()],G.prototype,"connectorImages",void 0),G=X([(0,c.Mo)("w3m-connect-walletconnect-widget")],G);var Z=(0,i.iv)`
  :host {
    margin-top: var(--wui-spacing-3xs);
  }
  wui-separator {
    margin: var(--wui-spacing-m) calc(var(--wui-spacing-m) * -1) var(--wui-spacing-xs)
      calc(var(--wui-spacing-m) * -1);
    width: calc(100% + var(--wui-spacing-s) * 2);
  }
`,Q=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let tt=class extends i.oi{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=u.ConnectorController.state.connectors,this.recommended=a.ApiController.state.recommended,this.featured=a.ApiController.state.featured,this.unsubscribe.push(u.ConnectorController.subscribeKey("connectors",t=>this.connectors=t),a.ApiController.subscribeKey("recommended",t=>this.recommended=t),a.ApiController.subscribeKey("featured",t=>this.featured=t))}disconnectedCallback(){this.unsubscribe.forEach(t=>t())}render(){return(0,i.dy)`
      <wui-flex flexDirection="column" gap="xs"> ${this.connectorListTemplate()} </wui-flex>
    `}connectorListTemplate(){let{custom:t,recent:e,announced:o,injected:r,multiChain:n,recommended:a,featured:l,external:s}=S.C.getConnectorsByType(this.connectors,this.recommended,this.featured);return S.C.getConnectorTypeOrder({custom:t,recent:e,announced:o,injected:r,multiChain:n,recommended:a,featured:l,external:s}).map(t=>{switch(t){case"injected":return(0,i.dy)`
            ${n.length?(0,i.dy)`<w3m-connect-multi-chain-widget
                  tabIdx=${(0,d.o)(this.tabIdx)}
                ></w3m-connect-multi-chain-widget>`:null}
            ${o.length?(0,i.dy)`<w3m-connect-announced-widget
                  tabIdx=${(0,d.o)(this.tabIdx)}
                ></w3m-connect-announced-widget>`:null}
            ${r.length?(0,i.dy)`<w3m-connect-injected-widget
                  .connectors=${r}
                  tabIdx=${(0,d.o)(this.tabIdx)}
                ></w3m-connect-injected-widget>`:null}
          `;case"walletConnect":return(0,i.dy)`<w3m-connect-walletconnect-widget
            tabIdx=${(0,d.o)(this.tabIdx)}
          ></w3m-connect-walletconnect-widget>`;case"recent":return(0,i.dy)`<w3m-connect-recent-widget
            tabIdx=${(0,d.o)(this.tabIdx)}
          ></w3m-connect-recent-widget>`;case"featured":return(0,i.dy)`<w3m-connect-featured-widget
            .wallets=${l}
            tabIdx=${(0,d.o)(this.tabIdx)}
          ></w3m-connect-featured-widget>`;case"custom":return(0,i.dy)`<w3m-connect-custom-widget
            tabIdx=${(0,d.o)(this.tabIdx)}
          ></w3m-connect-custom-widget>`;case"external":return(0,i.dy)`<w3m-connect-external-widget
            tabIdx=${(0,d.o)(this.tabIdx)}
          ></w3m-connect-external-widget>`;case"recommended":return(0,i.dy)`<w3m-connect-recommended-widget
            .wallets=${a}
            tabIdx=${(0,d.o)(this.tabIdx)}
          ></w3m-connect-recommended-widget>`;default:return console.warn(`Unknown connector type: ${t}`),null}})}};tt.styles=Z,Q([(0,r.Cb)()],tt.prototype,"tabIdx",void 0),Q([(0,r.SB)()],tt.prototype,"connectors",void 0),Q([(0,r.SB)()],tt.prototype,"recommended",void 0),Q([(0,r.SB)()],tt.prototype,"featured",void 0),tt=Q([(0,c.Mo)("w3m-connector-list")],tt);var te=o(49425),to=o(66909),ti=(0,i.iv)`
  :host {
    display: inline-flex;
    background-color: var(--wui-color-gray-glass-002);
    border-radius: var(--wui-border-radius-3xl);
    padding: var(--wui-spacing-3xs);
    position: relative;
    height: 36px;
    min-height: 36px;
    overflow: hidden;
  }

  :host::before {
    content: '';
    position: absolute;
    pointer-events: none;
    top: 4px;
    left: 4px;
    display: block;
    width: var(--local-tab-width);
    height: 28px;
    border-radius: var(--wui-border-radius-3xl);
    background-color: var(--wui-color-gray-glass-002);
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-002);
    transform: translateX(calc(var(--local-tab) * var(--local-tab-width)));
    transition: transform var(--wui-ease-out-power-1) var(--wui-duration-md);
    will-change: background-color, opacity;
  }

  :host([data-type='flex'])::before {
    left: 3px;
    transform: translateX(calc((var(--local-tab) * 34px) + (var(--local-tab) * 4px)));
  }

  :host([data-type='flex']) {
    display: flex;
    padding: 0px 0px 0px 12px;
    gap: 4px;
  }

  :host([data-type='flex']) > button > wui-text {
    position: absolute;
    left: 18px;
    opacity: 0;
  }

  button[data-active='true'] > wui-icon,
  button[data-active='true'] > wui-text {
    color: var(--wui-color-fg-100);
  }

  button[data-active='false'] > wui-icon,
  button[data-active='false'] > wui-text {
    color: var(--wui-color-fg-200);
  }

  button[data-active='true']:disabled,
  button[data-active='false']:disabled {
    background-color: transparent;
    opacity: 0.5;
    cursor: not-allowed;
  }

  button[data-active='true']:disabled > wui-text {
    color: var(--wui-color-fg-200);
  }

  button[data-active='false']:disabled > wui-text {
    color: var(--wui-color-fg-300);
  }

  button > wui-icon,
  button > wui-text {
    pointer-events: none;
    transition: color var(--wui-e ase-out-power-1) var(--wui-duration-md);
    will-change: color;
  }

  button {
    width: var(--local-tab-width);
    transition: background-color var(--wui-ease-out-power-1) var(--wui-duration-md);
    will-change: background-color;
  }

  :host([data-type='flex']) > button {
    width: 34px;
    position: relative;
    display: flex;
    justify-content: flex-start;
  }

  button:hover:enabled,
  button:active:enabled {
    background-color: transparent !important;
  }

  button:hover:enabled > wui-icon,
  button:active:enabled > wui-icon {
    transition: all var(--wui-ease-out-power-1) var(--wui-duration-lg);
    color: var(--wui-color-fg-125);
  }

  button:hover:enabled > wui-text,
  button:active:enabled > wui-text {
    transition: all var(--wui-ease-out-power-1) var(--wui-duration-lg);
    color: var(--wui-color-fg-125);
  }

  button {
    border-radius: var(--wui-border-radius-3xl);
  }
`,tr=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let tn=class extends i.oi{constructor(){super(...arguments),this.tabs=[],this.onTabChange=()=>null,this.buttons=[],this.disabled=!1,this.localTabWidth="100px",this.activeTab=0,this.isDense=!1}render(){return this.isDense=this.tabs.length>3,this.style.cssText=`
      --local-tab: ${this.activeTab};
      --local-tab-width: ${this.localTabWidth};
    `,this.dataset.type=this.isDense?"flex":"block",this.tabs.map((t,e)=>{let o=e===this.activeTab;return(0,i.dy)`
        <button
          ?disabled=${this.disabled}
          @click=${()=>this.onTabClick(e)}
          data-active=${o}
          data-testid="tab-${t.label?.toLowerCase()}"
        >
          ${this.iconTemplate(t)}
          <wui-text variant="small-600" color="inherit"> ${t.label} </wui-text>
        </button>
      `})}firstUpdated(){this.shadowRoot&&this.isDense&&(this.buttons=[...this.shadowRoot.querySelectorAll("button")],setTimeout(()=>{this.animateTabs(0,!0)},0))}iconTemplate(t){return t.icon?(0,i.dy)`<wui-icon size="xs" color="inherit" name=${t.icon}></wui-icon>`:null}onTabClick(t){this.buttons&&this.animateTabs(t,!1),this.activeTab=t,this.onTabChange(t)}animateTabs(t,e){let o=this.buttons[this.activeTab],i=this.buttons[t],r=o?.querySelector("wui-text"),n=i?.querySelector("wui-text"),a=i?.getBoundingClientRect(),l=n?.getBoundingClientRect();o&&r&&!e&&t!==this.activeTab&&(r.animate([{opacity:0}],{duration:50,easing:"ease",fill:"forwards"}),o.animate([{width:"34px"}],{duration:500,easing:"ease",fill:"forwards"})),i&&a&&l&&n&&(t!==this.activeTab||e)&&(this.localTabWidth=`${Math.round(a.width+l.width)+6}px`,i.animate([{width:`${a.width+l.width}px`}],{duration:e?0:500,fill:"forwards",easing:"ease"}),n.animate([{opacity:1}],{duration:e?0:125,delay:e?0:200,fill:"forwards",easing:"ease"}))}};tn.styles=[g.ET,g.ZM,ti],tr([(0,r.Cb)({type:Array})],tn.prototype,"tabs",void 0),tr([(0,r.Cb)()],tn.prototype,"onTabChange",void 0),tr([(0,r.Cb)({type:Array})],tn.prototype,"buttons",void 0),tr([(0,r.Cb)({type:Boolean})],tn.prototype,"disabled",void 0),tr([(0,r.Cb)()],tn.prototype,"localTabWidth",void 0),tr([(0,r.SB)()],tn.prototype,"activeTab",void 0),tr([(0,r.SB)()],tn.prototype,"isDense",void 0),tn=tr([(0,w.M)("wui-tabs")],tn);var ta=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let tl=class extends i.oi{constructor(){super(...arguments),this.platformTabs=[],this.unsubscribe=[],this.platforms=[],this.onSelectPlatfrom=void 0}disconnectCallback(){this.unsubscribe.forEach(t=>t())}render(){let t=this.generateTabs();return(0,i.dy)`
      <wui-flex justifyContent="center" .padding=${["0","0","l","0"]}>
        <wui-tabs .tabs=${t} .onTabChange=${this.onTabChange.bind(this)}></wui-tabs>
      </wui-flex>
    `}generateTabs(){let t=this.platforms.map(t=>"browser"===t?{label:"Browser",icon:"extension",platform:"browser"}:"mobile"===t?{label:"Mobile",icon:"mobile",platform:"mobile"}:"qrcode"===t?{label:"Mobile",icon:"mobile",platform:"qrcode"}:"web"===t?{label:"Webapp",icon:"browser",platform:"web"}:"desktop"===t?{label:"Desktop",icon:"desktop",platform:"desktop"}:{label:"Browser",icon:"extension",platform:"unsupported"});return this.platformTabs=t.map(({platform:t})=>t),t}onTabChange(t){let e=this.platformTabs[t];e&&this.onSelectPlatfrom?.(e)}};ta([(0,r.Cb)({type:Array})],tl.prototype,"platforms",void 0),ta([(0,r.Cb)()],tl.prototype,"onSelectPlatfrom",void 0),tl=ta([(0,c.Mo)("w3m-connecting-header")],tl);var ts=o(52005);o(21793);var tc=(0,i.iv)`
  :host {
    width: var(--local-width);
    position: relative;
  }

  button {
    border: none;
    border-radius: var(--local-border-radius);
    width: var(--local-width);
    white-space: nowrap;
  }

  /* -- Sizes --------------------------------------------------- */
  button[data-size='md'] {
    padding: 8.2px var(--wui-spacing-l) 9px var(--wui-spacing-l);
    height: 36px;
  }

  button[data-size='md'][data-icon-left='true'][data-icon-right='false'] {
    padding: 8.2px var(--wui-spacing-l) 9px var(--wui-spacing-s);
  }

  button[data-size='md'][data-icon-right='true'][data-icon-left='false'] {
    padding: 8.2px var(--wui-spacing-s) 9px var(--wui-spacing-l);
  }

  button[data-size='lg'] {
    padding: var(--wui-spacing-m) var(--wui-spacing-2l);
    height: 48px;
  }

  /* -- Variants --------------------------------------------------------- */
  button[data-variant='main'] {
    background-color: var(--wui-color-accent-100);
    color: var(--wui-color-inverse-100);
    border: none;
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-010);
  }

  button[data-variant='inverse'] {
    background-color: var(--wui-color-inverse-100);
    color: var(--wui-color-inverse-000);
    border: none;
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-010);
  }

  button[data-variant='accent'] {
    background-color: var(--wui-color-accent-glass-010);
    color: var(--wui-color-accent-100);
    border: none;
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-005);
  }

  button[data-variant='accent-error'] {
    background: var(--wui-color-error-glass-015);
    color: var(--wui-color-error-100);
    border: none;
    box-shadow: inset 0 0 0 1px var(--wui-color-error-glass-010);
  }

  button[data-variant='accent-success'] {
    background: var(--wui-color-success-glass-015);
    color: var(--wui-color-success-100);
    border: none;
    box-shadow: inset 0 0 0 1px var(--wui-color-success-glass-010);
  }

  button[data-variant='neutral'] {
    background: transparent;
    color: var(--wui-color-fg-100);
    border: none;
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-005);
  }

  /* -- Focus states --------------------------------------------------- */
  button[data-variant='main']:focus-visible:enabled {
    background-color: var(--wui-color-accent-090);
    box-shadow:
      inset 0 0 0 1px var(--wui-color-accent-100),
      0 0 0 4px var(--wui-color-accent-glass-020);
  }
  button[data-variant='inverse']:focus-visible:enabled {
    background-color: var(--wui-color-inverse-100);
    box-shadow:
      inset 0 0 0 1px var(--wui-color-gray-glass-010),
      0 0 0 4px var(--wui-color-accent-glass-020);
  }
  button[data-variant='accent']:focus-visible:enabled {
    background-color: var(--wui-color-accent-glass-010);
    box-shadow:
      inset 0 0 0 1px var(--wui-color-accent-100),
      0 0 0 4px var(--wui-color-accent-glass-020);
  }
  button[data-variant='accent-error']:focus-visible:enabled {
    background: var(--wui-color-error-glass-015);
    box-shadow:
      inset 0 0 0 1px var(--wui-color-error-100),
      0 0 0 4px var(--wui-color-error-glass-020);
  }
  button[data-variant='accent-success']:focus-visible:enabled {
    background: var(--wui-color-success-glass-015);
    box-shadow:
      inset 0 0 0 1px var(--wui-color-success-100),
      0 0 0 4px var(--wui-color-success-glass-020);
  }
  button[data-variant='neutral']:focus-visible:enabled {
    background: var(--wui-color-gray-glass-005);
    box-shadow:
      inset 0 0 0 1px var(--wui-color-gray-glass-010),
      0 0 0 4px var(--wui-color-gray-glass-002);
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  @media (hover: hover) and (pointer: fine) {
    button[data-variant='main']:hover:enabled {
      background-color: var(--wui-color-accent-090);
    }

    button[data-variant='main']:active:enabled {
      background-color: var(--wui-color-accent-080);
    }

    button[data-variant='accent']:hover:enabled {
      background-color: var(--wui-color-accent-glass-015);
    }

    button[data-variant='accent']:active:enabled {
      background-color: var(--wui-color-accent-glass-020);
    }

    button[data-variant='accent-error']:hover:enabled {
      background: var(--wui-color-error-glass-020);
      color: var(--wui-color-error-100);
    }

    button[data-variant='accent-error']:active:enabled {
      background: var(--wui-color-error-glass-030);
      color: var(--wui-color-error-100);
    }

    button[data-variant='accent-success']:hover:enabled {
      background: var(--wui-color-success-glass-020);
      color: var(--wui-color-success-100);
    }

    button[data-variant='accent-success']:active:enabled {
      background: var(--wui-color-success-glass-030);
      color: var(--wui-color-success-100);
    }

    button[data-variant='neutral']:hover:enabled {
      background: var(--wui-color-gray-glass-002);
    }

    button[data-variant='neutral']:active:enabled {
      background: var(--wui-color-gray-glass-005);
    }

    button[data-size='lg'][data-icon-left='true'][data-icon-right='false'] {
      padding-left: var(--wui-spacing-m);
    }

    button[data-size='lg'][data-icon-right='true'][data-icon-left='false'] {
      padding-right: var(--wui-spacing-m);
    }
  }

  /* -- Disabled state --------------------------------------------------- */
  button:disabled {
    background-color: var(--wui-color-gray-glass-002);
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-002);
    color: var(--wui-color-gray-glass-020);
    cursor: not-allowed;
  }

  button > wui-text {
    transition: opacity var(--wui-ease-out-power-1) var(--wui-duration-md);
    will-change: opacity;
    opacity: var(--local-opacity-100);
  }

  ::slotted(*) {
    transition: opacity var(--wui-ease-out-power-1) var(--wui-duration-md);
    will-change: opacity;
    opacity: var(--local-opacity-100);
  }

  wui-loading-spinner {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    opacity: var(--local-opacity-000);
  }
`,td=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let tu={main:"inverse-100",inverse:"inverse-000",accent:"accent-100","accent-error":"error-100","accent-success":"success-100",neutral:"fg-100",disabled:"gray-glass-020"},th={lg:"paragraph-600",md:"small-600"},tp={lg:"md",md:"md"},tg=class extends i.oi{constructor(){super(...arguments),this.size="lg",this.disabled=!1,this.fullWidth=!1,this.loading=!1,this.variant="main",this.hasIconLeft=!1,this.hasIconRight=!1,this.borderRadius="m"}render(){this.style.cssText=`
    --local-width: ${this.fullWidth?"100%":"auto"};
    --local-opacity-100: ${this.loading?0:1};
    --local-opacity-000: ${this.loading?1:0};
    --local-border-radius: var(--wui-border-radius-${this.borderRadius});
    `;let t=this.textVariant??th[this.size];return(0,i.dy)`
      <button
        data-variant=${this.variant}
        data-icon-left=${this.hasIconLeft}
        data-icon-right=${this.hasIconRight}
        data-size=${this.size}
        ?disabled=${this.disabled}
      >
        ${this.loadingTemplate()}
        <slot name="iconLeft" @slotchange=${()=>this.handleSlotLeftChange()}></slot>
        <wui-text variant=${t} color="inherit">
          <slot></slot>
        </wui-text>
        <slot name="iconRight" @slotchange=${()=>this.handleSlotRightChange()}></slot>
      </button>
    `}handleSlotLeftChange(){this.hasIconLeft=!0}handleSlotRightChange(){this.hasIconRight=!0}loadingTemplate(){if(this.loading){let t=tp[this.size],e=this.disabled?tu.disabled:tu[this.variant];return(0,i.dy)`<wui-loading-spinner color=${e} size=${t}></wui-loading-spinner>`}return(0,i.dy)``}};tg.styles=[g.ET,g.ZM,tc],td([(0,r.Cb)()],tg.prototype,"size",void 0),td([(0,r.Cb)({type:Boolean})],tg.prototype,"disabled",void 0),td([(0,r.Cb)({type:Boolean})],tg.prototype,"fullWidth",void 0),td([(0,r.Cb)({type:Boolean})],tg.prototype,"loading",void 0),td([(0,r.Cb)()],tg.prototype,"variant",void 0),td([(0,r.Cb)({type:Boolean})],tg.prototype,"hasIconLeft",void 0),td([(0,r.Cb)({type:Boolean})],tg.prototype,"hasIconRight",void 0),td([(0,r.Cb)()],tg.prototype,"borderRadius",void 0),td([(0,r.Cb)()],tg.prototype,"textVariant",void 0),tg=td([(0,w.M)("wui-button")],tg),o(4594);var tw=(0,i.iv)`
  button {
    padding: var(--wui-spacing-4xs) var(--wui-spacing-xxs);
    border-radius: var(--wui-border-radius-3xs);
    background-color: transparent;
    color: var(--wui-color-accent-100);
  }

  button:disabled {
    background-color: transparent;
    color: var(--wui-color-gray-glass-015);
  }

  button:hover {
    background-color: var(--wui-color-gray-glass-005);
  }
`,tf=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let tb=class extends i.oi{constructor(){super(...arguments),this.tabIdx=void 0,this.disabled=!1,this.color="inherit"}render(){return(0,i.dy)`
      <button ?disabled=${this.disabled} tabindex=${(0,d.o)(this.tabIdx)}>
        <slot name="iconLeft"></slot>
        <wui-text variant="small-600" color=${this.color}>
          <slot></slot>
        </wui-text>
        <slot name="iconRight"></slot>
      </button>
    `}};tb.styles=[g.ET,g.ZM,tw],tf([(0,r.Cb)()],tb.prototype,"tabIdx",void 0),tf([(0,r.Cb)({type:Boolean})],tb.prototype,"disabled",void 0),tf([(0,r.Cb)()],tb.prototype,"color",void 0),tb=tf([(0,w.M)("wui-link")],tb);var tv=(0,i.iv)`
  :host {
    display: block;
    width: var(--wui-box-size-md);
    height: var(--wui-box-size-md);
  }

  svg {
    width: var(--wui-box-size-md);
    height: var(--wui-box-size-md);
  }

  rect {
    fill: none;
    stroke: var(--wui-color-accent-100);
    stroke-width: 4px;
    stroke-linecap: round;
    animation: dash 1s linear infinite;
  }

  @keyframes dash {
    to {
      stroke-dashoffset: 0px;
    }
  }
`,tm=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let ty=class extends i.oi{constructor(){super(...arguments),this.radius=36}render(){return this.svgLoaderTemplate()}svgLoaderTemplate(){let t=this.radius>50?50:this.radius,e=36-t;return(0,i.dy)`
      <svg viewBox="0 0 110 110" width="110" height="110">
        <rect
          x="2"
          y="2"
          width="106"
          height="106"
          rx=${t}
          stroke-dasharray="${116+e} ${245+e}"
          stroke-dashoffset=${360+1.75*e}
        />
      </svg>
    `}};ty.styles=[g.ET,tv],tm([(0,r.Cb)({type:Number})],ty.prototype,"radius",void 0),ty=tm([(0,w.M)("wui-loading-thumbnail")],ty),o(44732);var tx=(0,i.iv)`
  button {
    border: none;
    border-radius: var(--wui-border-radius-3xl);
  }

  button[data-variant='main'] {
    background-color: var(--wui-color-accent-100);
    color: var(--wui-color-inverse-100);
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-010);
  }

  button[data-variant='accent'] {
    background-color: var(--wui-color-accent-glass-010);
    color: var(--wui-color-accent-100);
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-005);
  }

  button[data-variant='gray'] {
    background-color: transparent;
    color: var(--wui-color-fg-200);
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-010);
  }

  button[data-variant='shade'] {
    background-color: transparent;
    color: var(--wui-color-accent-100);
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-010);
  }

  button[data-size='sm'] {
    height: 32px;
    padding: 0 var(--wui-spacing-s);
  }

  button[data-size='md'] {
    height: 40px;
    padding: 0 var(--wui-spacing-l);
  }

  button[data-size='sm'] > wui-image {
    width: 16px;
    height: 16px;
  }

  button[data-size='md'] > wui-image {
    width: 24px;
    height: 24px;
  }

  button[data-size='sm'] > wui-icon {
    width: 12px;
    height: 12px;
  }

  button[data-size='md'] > wui-icon {
    width: 14px;
    height: 14px;
  }

  wui-image {
    border-radius: var(--wui-border-radius-3xl);
    overflow: hidden;
  }

  button.disabled > wui-icon,
  button.disabled > wui-image {
    filter: grayscale(1);
  }

  button[data-variant='main'] > wui-image {
    box-shadow: inset 0 0 0 1px var(--wui-color-accent-090);
  }

  button[data-variant='shade'] > wui-image,
  button[data-variant='gray'] > wui-image {
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-010);
  }

  @media (hover: hover) and (pointer: fine) {
    button[data-variant='main']:focus-visible {
      background-color: var(--wui-color-accent-090);
    }

    button[data-variant='main']:hover:enabled {
      background-color: var(--wui-color-accent-090);
    }

    button[data-variant='main']:active:enabled {
      background-color: var(--wui-color-accent-080);
    }

    button[data-variant='accent']:hover:enabled {
      background-color: var(--wui-color-accent-glass-015);
    }

    button[data-variant='accent']:active:enabled {
      background-color: var(--wui-color-accent-glass-020);
    }

    button[data-variant='shade']:focus-visible,
    button[data-variant='gray']:focus-visible,
    button[data-variant='shade']:hover,
    button[data-variant='gray']:hover {
      background-color: var(--wui-color-gray-glass-002);
    }

    button[data-variant='gray']:active,
    button[data-variant='shade']:active {
      background-color: var(--wui-color-gray-glass-005);
    }
  }

  button.disabled {
    color: var(--wui-color-gray-glass-020);
    background-color: var(--wui-color-gray-glass-002);
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-002);
    pointer-events: none;
  }
`,tC=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let t$=class extends i.oi{constructor(){super(...arguments),this.variant="accent",this.imageSrc="",this.disabled=!1,this.icon="externalLink",this.size="md",this.text=""}render(){let t="sm"===this.size?"small-600":"paragraph-600";return(0,i.dy)`
      <button
        class=${this.disabled?"disabled":""}
        data-variant=${this.variant}
        data-size=${this.size}
      >
        ${this.imageSrc?(0,i.dy)`<wui-image src=${this.imageSrc}></wui-image>`:null}
        <wui-text variant=${t} color="inherit"> ${this.text} </wui-text>
        <wui-icon name=${this.icon} color="inherit" size="inherit"></wui-icon>
      </button>
    `}};t$.styles=[g.ET,g.ZM,tx],tC([(0,r.Cb)()],t$.prototype,"variant",void 0),tC([(0,r.Cb)()],t$.prototype,"imageSrc",void 0),tC([(0,r.Cb)({type:Boolean})],t$.prototype,"disabled",void 0),tC([(0,r.Cb)()],t$.prototype,"icon",void 0),tC([(0,r.Cb)()],t$.prototype,"size",void 0),tC([(0,r.Cb)()],t$.prototype,"text",void 0),t$=tC([(0,w.M)("wui-chip-button")],t$);var tk=(0,i.iv)`
  wui-flex {
    width: 100%;
    background-color: var(--wui-color-gray-glass-002);
    border-radius: var(--wui-border-radius-xs);
  }
`,tR=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let tE=class extends i.oi{constructor(){super(...arguments),this.disabled=!1,this.label="",this.buttonLabel=""}render(){return(0,i.dy)`
      <wui-flex
        justifyContent="space-between"
        alignItems="center"
        .padding=${["1xs","2l","1xs","2l"]}
      >
        <wui-text variant="paragraph-500" color="fg-200">${this.label}</wui-text>
        <wui-chip-button size="sm" variant="shade" text=${this.buttonLabel} icon="chevronRight">
        </wui-chip-button>
      </wui-flex>
    `}};tE.styles=[g.ET,g.ZM,tk],tR([(0,r.Cb)({type:Boolean})],tE.prototype,"disabled",void 0),tR([(0,r.Cb)()],tE.prototype,"label",void 0),tR([(0,r.Cb)()],tE.prototype,"buttonLabel",void 0),tE=tR([(0,w.M)("wui-cta-button")],tE);var tI=(0,i.iv)`
  :host {
    display: block;
    padding: 0 var(--wui-spacing-xl) var(--wui-spacing-xl);
  }
`,tS=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let tT=class extends i.oi{constructor(){super(...arguments),this.wallet=void 0}render(){if(!this.wallet)return this.style.display="none",null;let{name:t,app_store:e,play_store:o,chrome_store:r,homepage:a}=this.wallet,l=n.j.isMobile(),s=n.j.isIos(),d=n.j.isAndroid(),u=[e,o,a,r].filter(Boolean).length>1,h=c.Hg.getTruncateString({string:t,charsStart:12,charsEnd:0,truncate:"end"});return u&&!l?(0,i.dy)`
        <wui-cta-button
          label=${`Don't have ${h}?`}
          buttonLabel="Get"
          @click=${()=>p.RouterController.push("Downloads",{wallet:this.wallet})}
        ></wui-cta-button>
      `:!u&&a?(0,i.dy)`
        <wui-cta-button
          label=${`Don't have ${h}?`}
          buttonLabel="Get"
          @click=${this.onHomePage.bind(this)}
        ></wui-cta-button>
      `:e&&s?(0,i.dy)`
        <wui-cta-button
          label=${`Don't have ${h}?`}
          buttonLabel="Get"
          @click=${this.onAppStore.bind(this)}
        ></wui-cta-button>
      `:o&&d?(0,i.dy)`
        <wui-cta-button
          label=${`Don't have ${h}?`}
          buttonLabel="Get"
          @click=${this.onPlayStore.bind(this)}
        ></wui-cta-button>
      `:(this.style.display="none",null)}onAppStore(){this.wallet?.app_store&&n.j.openHref(this.wallet.app_store,"_blank")}onPlayStore(){this.wallet?.play_store&&n.j.openHref(this.wallet.play_store,"_blank")}onHomePage(){this.wallet?.homepage&&n.j.openHref(this.wallet.homepage,"_blank")}};tT.styles=[tI],tS([(0,r.Cb)({type:Object})],tT.prototype,"wallet",void 0),tT=tS([(0,c.Mo)("w3m-mobile-download-links")],tT);var tj=(0,i.iv)`
  @keyframes shake {
    0% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(3px);
    }
    50% {
      transform: translateX(-3px);
    }
    75% {
      transform: translateX(3px);
    }
    100% {
      transform: translateX(0);
    }
  }

  wui-flex:first-child:not(:only-child) {
    position: relative;
  }

  wui-loading-thumbnail {
    position: absolute;
  }

  wui-icon-box {
    position: absolute;
    right: calc(var(--wui-spacing-3xs) * -1);
    bottom: calc(var(--wui-spacing-3xs) * -1);
    opacity: 0;
    transform: scale(0.5);
    transition-property: opacity, transform;
    transition-duration: var(--wui-duration-lg);
    transition-timing-function: var(--wui-ease-out-power-2);
    will-change: opacity, transform;
  }

  wui-text[align='center'] {
    width: 100%;
    padding: 0px var(--wui-spacing-l);
  }

  [data-error='true'] wui-icon-box {
    opacity: 1;
    transform: scale(1);
  }

  [data-error='true'] > wui-flex:first-child {
    animation: shake 250ms cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  }

  [data-retry='false'] wui-link {
    display: none;
  }

  [data-retry='true'] wui-link {
    display: block;
    opacity: 1;
  }
`,tP=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};class tO extends i.oi{constructor(){super(),this.wallet=p.RouterController.state.data?.wallet,this.connector=p.RouterController.state.data?.connector,this.timeout=void 0,this.secondaryBtnIcon="refresh",this.onConnect=void 0,this.onRender=void 0,this.onAutoConnect=void 0,this.isWalletConnect=!0,this.unsubscribe=[],this.imageSrc=I.f.getWalletImage(this.wallet)??I.f.getConnectorImage(this.connector),this.name=this.wallet?.name??this.connector?.name??"Wallet",this.isRetrying=!1,this.uri=P.ConnectionController.state.wcUri,this.error=P.ConnectionController.state.wcError,this.ready=!1,this.showRetry=!1,this.secondaryBtnLabel="Try again",this.secondaryLabel="Accept connection request in the wallet",this.isLoading=!1,this.isMobile=!1,this.onRetry=void 0,this.unsubscribe.push(P.ConnectionController.subscribeKey("wcUri",t=>{this.uri=t,this.isRetrying&&this.onRetry&&(this.isRetrying=!1,this.onConnect?.())}),P.ConnectionController.subscribeKey("wcError",t=>this.error=t)),(n.j.isTelegram()||n.j.isSafari())&&n.j.isIos()&&P.ConnectionController.state.wcUri&&this.onConnect?.()}firstUpdated(){this.onAutoConnect?.(),this.showRetry=!this.onAutoConnect}disconnectedCallback(){this.unsubscribe.forEach(t=>t()),P.ConnectionController.setWcError(!1),clearTimeout(this.timeout)}render(){this.onRender?.(),this.onShowRetry();let t=this.error?"Connection can be declined if a previous request is still active":this.secondaryLabel,e=`Continue in ${this.name}`;return this.error&&(e="Connection declined"),(0,i.dy)`
      <wui-flex
        data-error=${(0,d.o)(this.error)}
        data-retry=${this.showRetry}
        flexDirection="column"
        alignItems="center"
        .padding=${["3xl","xl","xl","xl"]}
        gap="xl"
      >
        <wui-flex justifyContent="center" alignItems="center">
          <wui-wallet-image size="lg" imageSrc=${(0,d.o)(this.imageSrc)}></wui-wallet-image>

          ${this.error?null:this.loaderTemplate()}

          <wui-icon-box
            backgroundColor="error-100"
            background="opaque"
            iconColor="error-100"
            icon="close"
            size="sm"
            border
            borderColor="wui-color-bg-125"
          ></wui-icon-box>
        </wui-flex>

        <wui-flex flexDirection="column" alignItems="center" gap="xs">
          <wui-text variant="paragraph-500" color=${this.error?"error-100":"fg-100"}>
            ${e}
          </wui-text>
          <wui-text align="center" variant="small-500" color="fg-200">${t}</wui-text>
        </wui-flex>

        ${this.secondaryBtnLabel?(0,i.dy)`
              <wui-button
                variant="accent"
                size="md"
                ?disabled=${this.isRetrying||this.isLoading}
                @click=${this.onTryAgain.bind(this)}
                data-testid="w3m-connecting-widget-secondary-button"
              >
                <wui-icon color="inherit" slot="iconLeft" name=${this.secondaryBtnIcon}></wui-icon>
                ${this.secondaryBtnLabel}
              </wui-button>
            `:null}
      </wui-flex>

      ${this.isWalletConnect?(0,i.dy)`
            <wui-flex .padding=${["0","xl","xl","xl"]} justifyContent="center">
              <wui-link @click=${this.onCopyUri} color="fg-200" data-testid="wui-link-copy">
                <wui-icon size="xs" color="fg-200" slot="iconLeft" name="copy"></wui-icon>
                Copy link
              </wui-link>
            </wui-flex>
          `:null}

      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links>
    `}onShowRetry(){if(this.error&&!this.showRetry){this.showRetry=!0;let t=this.shadowRoot?.querySelector("wui-button");t?.animate([{opacity:0},{opacity:1}],{fill:"forwards",easing:"ease"})}}onTryAgain(){P.ConnectionController.setWcError(!1),this.onRetry?(this.isRetrying=!0,this.onRetry?.()):this.onConnect?.()}loaderTemplate(){let t=ts.ThemeController.state.themeVariables["--w3m-border-radius-master"],e=t?parseInt(t.replace("px",""),10):4;return(0,i.dy)`<wui-loading-thumbnail radius=${9*e}></wui-loading-thumbnail>`}onCopyUri(){try{this.uri&&(n.j.copyToClopboard(this.uri),to.SnackController.showSuccess("Link copied"))}catch{to.SnackController.showError("Failed to copy")}}}tO.styles=tj,tP([(0,r.SB)()],tO.prototype,"isRetrying",void 0),tP([(0,r.SB)()],tO.prototype,"uri",void 0),tP([(0,r.SB)()],tO.prototype,"error",void 0),tP([(0,r.SB)()],tO.prototype,"ready",void 0),tP([(0,r.SB)()],tO.prototype,"showRetry",void 0),tP([(0,r.SB)()],tO.prototype,"secondaryBtnLabel",void 0),tP([(0,r.SB)()],tO.prototype,"secondaryLabel",void 0),tP([(0,r.SB)()],tO.prototype,"isLoading",void 0),tP([(0,r.Cb)({type:Boolean})],tO.prototype,"isMobile",void 0),tP([(0,r.Cb)()],tO.prototype,"onRetry",void 0);let tB=class extends tO{constructor(){if(super(),!this.wallet)throw Error("w3m-connecting-wc-browser: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.onAutoConnect=this.onConnectProxy.bind(this),h.X.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"browser"}})}async onConnectProxy(){try{this.error=!1;let{connectors:t}=u.ConnectorController.state,e=t.find(t=>"ANNOUNCED"===t.type&&t.info?.rdns===this.wallet?.rdns||"INJECTED"===t.type||t.name===this.wallet?.name);if(e)await P.ConnectionController.connectExternal(e,e.chain);else throw Error("w3m-connecting-wc-browser: No connector found");te.I.close(),h.X.sendEvent({type:"track",event:"CONNECT_SUCCESS",properties:{method:"browser",name:this.wallet?.name||"Unknown"}})}catch(t){h.X.sendEvent({type:"track",event:"CONNECT_ERROR",properties:{message:t?.message??"Unknown"}}),this.error=!0}}};tB=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a}([(0,c.Mo)("w3m-connecting-wc-browser")],tB);let tA=class extends tO{constructor(){if(super(),!this.wallet)throw Error("w3m-connecting-wc-desktop: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.onRender=this.onRenderProxy.bind(this),h.X.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"desktop"}})}onRenderProxy(){!this.ready&&this.uri&&(this.ready=!0,this.onConnect?.())}onConnectProxy(){if(this.wallet?.desktop_link&&this.uri)try{this.error=!1;let{desktop_link:t,name:e}=this.wallet,{redirect:o,href:i}=n.j.formatNativeUrl(t,this.uri);P.ConnectionController.setWcLinking({name:e,href:i}),P.ConnectionController.setRecentWallet(this.wallet),n.j.openHref(o,"_blank")}catch{this.error=!0}}};tA=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a}([(0,c.Mo)("w3m-connecting-wc-desktop")],tA);var tL=o(59712),tM=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let tz=class extends tO{constructor(){if(super(),this.btnLabelTimeout=void 0,this.redirectDeeplink=void 0,this.redirectUniversalLink=void 0,this.target=void 0,this.preferUniversalLinks=l.OptionsController.state.experimental_preferUniversalLinks,this.isLoading=!0,this.onConnect=()=>{if(this.wallet?.mobile_link&&this.uri)try{this.error=!1;let{mobile_link:t,link_mode:e,name:o}=this.wallet,{redirect:i,redirectUniversalLink:r,href:a}=n.j.formatNativeUrl(t,this.uri,e);this.redirectDeeplink=i,this.redirectUniversalLink=r,this.target=n.j.isIframe()?"_top":"_self",P.ConnectionController.setWcLinking({name:o,href:a}),P.ConnectionController.setRecentWallet(this.wallet),this.preferUniversalLinks&&this.redirectUniversalLink?n.j.openHref(this.redirectUniversalLink,this.target):n.j.openHref(this.redirectDeeplink,this.target)}catch(t){h.X.sendEvent({type:"track",event:"CONNECT_PROXY_ERROR",properties:{message:t instanceof Error?t.message:"Error parsing the deeplink",uri:this.uri,mobile_link:this.wallet.mobile_link,name:this.wallet.name}}),this.error=!0}},!this.wallet)throw Error("w3m-connecting-wc-mobile: No wallet provided");this.secondaryBtnLabel="Open",this.secondaryLabel=tL.bq.CONNECT_LABELS.MOBILE,this.secondaryBtnIcon="externalLink",this.onHandleURI(),this.unsubscribe.push(P.ConnectionController.subscribeKey("wcUri",()=>{this.onHandleURI()})),h.X.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"mobile"}})}disconnectedCallback(){super.disconnectedCallback(),clearTimeout(this.btnLabelTimeout)}onHandleURI(){this.isLoading=!this.uri,!this.ready&&this.uri&&(this.ready=!0,this.onConnect?.())}onTryAgain(){P.ConnectionController.setWcError(!1),this.onConnect?.()}};tM([(0,r.SB)()],tz.prototype,"redirectDeeplink",void 0),tM([(0,r.SB)()],tz.prototype,"redirectUniversalLink",void 0),tM([(0,r.SB)()],tz.prototype,"target",void 0),tM([(0,r.SB)()],tz.prototype,"preferUniversalLinks",void 0),tM([(0,r.SB)()],tz.prototype,"isLoading",void 0),tz=tM([(0,c.Mo)("w3m-connecting-wc-mobile")],tz);var tW=o(35819);function tN(t,e,o){return t!==e&&(t-e<0?e-t:t-e)<=o+.1}let tD={generate({uri:t,size:e,logoSize:o,dotColor:r="#141414"}){let n=[],a=function(t,e){let o=Array.prototype.slice.call(tW.create(t,{errorCorrectionLevel:"Q"}).modules.data,0),i=Math.sqrt(o.length);return o.reduce((t,e,o)=>(o%i==0?t.push([e]):t[t.length-1].push(e))&&t,[])}(t,0),l=e/a.length,s=[{x:0,y:0},{x:1,y:0},{x:0,y:1}];s.forEach(({x:t,y:e})=>{let o=(a.length-7)*l*t,c=(a.length-7)*l*e;for(let t=0;t<s.length;t+=1){let e=l*(7-2*t);n.push((0,i.YP)`
            <rect
              fill=${2===t?r:"transparent"}
              width=${0===t?e-5:e}
              rx= ${0===t?(e-5)*.45:.45*e}
              ry= ${0===t?(e-5)*.45:.45*e}
              stroke=${r}
              stroke-width=${0===t?5:0}
              height=${0===t?e-5:e}
              x= ${0===t?c+l*t+2.5:c+l*t}
              y= ${0===t?o+l*t+2.5:o+l*t}
            />
          `)}});let c=Math.floor((o+25)/l),d=a.length/2-c/2,u=a.length/2+c/2-1,h=[];a.forEach((t,e)=>{t.forEach((t,o)=>{!a[e][o]||e<7&&o<7||e>a.length-8&&o<7||e<7&&o>a.length-8||e>d&&e<u&&o>d&&o<u||h.push([e*l+l/2,o*l+l/2])})});let p={};return h.forEach(([t,e])=>{p[t]?p[t]?.push(e):p[t]=[e]}),Object.entries(p).map(([t,e])=>{let o=e.filter(t=>e.every(e=>!tN(t,e,l)));return[Number(t),o]}).forEach(([t,e])=>{e.forEach(e=>{n.push((0,i.YP)`<circle cx=${t} cy=${e} fill=${r} r=${l/2.5} />`)})}),Object.entries(p).filter(([t,e])=>e.length>1).map(([t,e])=>{let o=e.filter(t=>e.some(e=>tN(t,e,l)));return[Number(t),o]}).map(([t,e])=>{e.sort((t,e)=>t<e?-1:1);let o=[];for(let t of e){let e=o.find(e=>e.some(e=>tN(t,e,l)));e?e.push(t):o.push([t])}return[t,o.map(t=>[t[0],t[t.length-1]])]}).forEach(([t,e])=>{e.forEach(([e,o])=>{n.push((0,i.YP)`
              <line
                x1=${t}
                x2=${t}
                y1=${e}
                y2=${o}
                stroke=${r}
                stroke-width=${l/1.25}
                stroke-linecap="round"
              />
            `)})}),n}};var tU=(0,i.iv)`
  :host {
    position: relative;
    user-select: none;
    display: block;
    overflow: hidden;
    aspect-ratio: 1 / 1;
    width: var(--local-size);
  }

  :host([data-theme='dark']) {
    border-radius: clamp(0px, var(--wui-border-radius-l), 40px);
    background-color: var(--wui-color-inverse-100);
    padding: var(--wui-spacing-l);
  }

  :host([data-theme='light']) {
    box-shadow: 0 0 0 1px var(--wui-color-bg-125);
    background-color: var(--wui-color-bg-125);
  }

  :host([data-clear='true']) > wui-icon {
    display: none;
  }

  svg:first-child,
  wui-image,
  wui-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translateY(-50%) translateX(-50%);
  }

  wui-image {
    width: 25%;
    height: 25%;
    border-radius: var(--wui-border-radius-xs);
  }

  wui-icon {
    width: 100%;
    height: 100%;
    color: var(--local-icon-color) !important;
    transform: translateY(-50%) translateX(-50%) scale(0.25);
  }
`,t_=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let tq=class extends i.oi{constructor(){super(...arguments),this.uri="",this.size=0,this.theme="dark",this.imageSrc=void 0,this.alt=void 0,this.arenaClear=void 0,this.farcaster=void 0}render(){return this.dataset.theme=this.theme,this.dataset.clear=String(this.arenaClear),this.style.cssText=`
     --local-size: ${this.size}px;
     --local-icon-color: ${this.color??"#3396ff"}
    `,(0,i.dy)`${this.templateVisual()} ${this.templateSvg()}`}templateSvg(){let t="light"===this.theme?this.size:this.size-32;return(0,i.YP)`
      <svg height=${t} width=${t}>
        ${tD.generate({uri:this.uri,size:t,logoSize:this.arenaClear?0:t/4,dotColor:this.color})}
      </svg>
    `}templateVisual(){return this.imageSrc?(0,i.dy)`<wui-image src=${this.imageSrc} alt=${this.alt??"logo"}></wui-image>`:this.farcaster?(0,i.dy)`<wui-icon
        class="farcaster"
        size="inherit"
        color="inherit"
        name="farcaster"
      ></wui-icon>`:(0,i.dy)`<wui-icon size="inherit" color="inherit" name="walletConnect"></wui-icon>`}};tq.styles=[g.ET,tU],t_([(0,r.Cb)()],tq.prototype,"uri",void 0),t_([(0,r.Cb)({type:Number})],tq.prototype,"size",void 0),t_([(0,r.Cb)()],tq.prototype,"theme",void 0),t_([(0,r.Cb)()],tq.prototype,"imageSrc",void 0),t_([(0,r.Cb)()],tq.prototype,"alt",void 0),t_([(0,r.Cb)()],tq.prototype,"color",void 0),t_([(0,r.Cb)({type:Boolean})],tq.prototype,"arenaClear",void 0),t_([(0,r.Cb)({type:Boolean})],tq.prototype,"farcaster",void 0),tq=t_([(0,w.M)("wui-qr-code")],tq);var tH=(0,i.iv)`
  :host {
    display: block;
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-005);
    background: linear-gradient(
      120deg,
      var(--wui-color-bg-200) 5%,
      var(--wui-color-bg-200) 48%,
      var(--wui-color-bg-300) 55%,
      var(--wui-color-bg-300) 60%,
      var(--wui-color-bg-300) calc(60% + 10px),
      var(--wui-color-bg-200) calc(60% + 12px),
      var(--wui-color-bg-200) 100%
    );
    background-size: 250%;
    animation: shimmer 3s linear infinite reverse;
  }

  :host([variant='light']) {
    background: linear-gradient(
      120deg,
      var(--wui-color-bg-150) 5%,
      var(--wui-color-bg-150) 48%,
      var(--wui-color-bg-200) 55%,
      var(--wui-color-bg-200) 60%,
      var(--wui-color-bg-200) calc(60% + 10px),
      var(--wui-color-bg-150) calc(60% + 12px),
      var(--wui-color-bg-150) 100%
    );
    background-size: 250%;
  }

  @keyframes shimmer {
    from {
      background-position: -250% 0;
    }
    to {
      background-position: 250% 0;
    }
  }
`,tK=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let tV=class extends i.oi{constructor(){super(...arguments),this.width="",this.height="",this.borderRadius="m",this.variant="default"}render(){return this.style.cssText=`
      width: ${this.width};
      height: ${this.height};
      border-radius: clamp(0px,var(--wui-border-radius-${this.borderRadius}), 40px);
    `,(0,i.dy)`<slot></slot>`}};tV.styles=[tH],tK([(0,r.Cb)()],tV.prototype,"width",void 0),tK([(0,r.Cb)()],tV.prototype,"height",void 0),tK([(0,r.Cb)()],tV.prototype,"borderRadius",void 0),tK([(0,r.Cb)()],tV.prototype,"variant",void 0),tV=tK([(0,w.M)("wui-shimmer")],tV);var tF=(0,i.iv)`
  .reown-logo {
    height: var(--wui-spacing-xxl);
  }

  a {
    text-decoration: none;
    cursor: pointer;
  }

  a:hover {
    opacity: 0.9;
  }
`;let tY=class extends i.oi{render(){return(0,i.dy)`
      <a
        data-testid="ux-branding-reown"
        href=${"https://reown.com"}
        rel="noreferrer"
        target="_blank"
        style="text-decoration: none;"
      >
        <wui-flex
          justifyContent="center"
          alignItems="center"
          gap="xs"
          .padding=${["0","0","l","0"]}
        >
          <wui-text variant="small-500" color="fg-100"> UX by </wui-text>
          <wui-icon name="reown" size="xxxl" class="reown-logo"></wui-icon>
        </wui-flex>
      </a>
    `}};tY.styles=[g.ET,g.ZM,tF],tY=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a}([(0,w.M)("wui-ux-by-reown")],tY);var tJ=(0,i.iv)`
  @keyframes fadein {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  wui-shimmer {
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: clamp(0px, var(--wui-border-radius-l), 40px) !important;
  }

  wui-qr-code {
    opacity: 0;
    animation-duration: 200ms;
    animation-timing-function: ease;
    animation-name: fadein;
    animation-fill-mode: forwards;
  }
`;let tX=class extends tO{constructor(){super(),this.forceUpdate=()=>{this.requestUpdate()},window.addEventListener("resize",this.forceUpdate),h.X.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet?.name??"WalletConnect",platform:"qrcode"}})}disconnectedCallback(){super.disconnectedCallback(),this.unsubscribe?.forEach(t=>t()),window.removeEventListener("resize",this.forceUpdate)}render(){return this.onRenderProxy(),(0,i.dy)`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["0","xl","xl","xl"]}
        gap="xl"
      >
        <wui-shimmer borderRadius="l" width="100%"> ${this.qrCodeTemplate()} </wui-shimmer>

        <wui-text variant="paragraph-500" color="fg-100">
          Scan this QR Code with your phone
        </wui-text>
        ${this.copyTemplate()}
      </wui-flex>
      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links>
    `}onRenderProxy(){!this.ready&&this.uri&&(this.timeout=setTimeout(()=>{this.ready=!0},200))}qrCodeTemplate(){if(!this.uri||!this.ready)return null;let t=this.getBoundingClientRect().width-40,e=this.wallet?this.wallet.name:void 0;return P.ConnectionController.setWcLinking(void 0),P.ConnectionController.setRecentWallet(this.wallet),(0,i.dy)` <wui-qr-code
      size=${t}
      theme=${ts.ThemeController.state.themeMode}
      uri=${this.uri}
      imageSrc=${(0,d.o)(I.f.getWalletImage(this.wallet))}
      color=${(0,d.o)(ts.ThemeController.state.themeVariables["--w3m-qr-color"])}
      alt=${(0,d.o)(e)}
      data-testid="wui-qr-code"
    ></wui-qr-code>`}copyTemplate(){let t=!this.uri||!this.ready;return(0,i.dy)`<wui-link
      .disabled=${t}
      @click=${this.onCopyUri}
      color="fg-200"
      data-testid="copy-wc2-uri"
    >
      <wui-icon size="xs" color="fg-200" slot="iconLeft" name="copy"></wui-icon>
      Copy link
    </wui-link>`}};tX.styles=tJ,tX=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a}([(0,c.Mo)("w3m-connecting-wc-qrcode")],tX);let tG=class extends i.oi{constructor(){if(super(),this.wallet=p.RouterController.state.data?.wallet,!this.wallet)throw Error("w3m-connecting-wc-unsupported: No wallet provided");h.X.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"browser"}})}render(){return(0,i.dy)`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["3xl","xl","xl","xl"]}
        gap="xl"
      >
        <wui-wallet-image
          size="lg"
          imageSrc=${(0,d.o)(I.f.getWalletImage(this.wallet))}
        ></wui-wallet-image>

        <wui-text variant="paragraph-500" color="fg-100">Not Detected</wui-text>
      </wui-flex>

      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links>
    `}};tG=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a}([(0,c.Mo)("w3m-connecting-wc-unsupported")],tG);var tZ=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let tQ=class extends tO{constructor(){if(super(),this.isLoading=!0,!this.wallet)throw Error("w3m-connecting-wc-web: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.secondaryBtnLabel="Open",this.secondaryLabel=tL.bq.CONNECT_LABELS.MOBILE,this.secondaryBtnIcon="externalLink",this.updateLoadingState(),this.unsubscribe.push(P.ConnectionController.subscribeKey("wcUri",()=>{this.updateLoadingState()})),h.X.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"web"}})}updateLoadingState(){this.isLoading=!this.uri}onConnectProxy(){if(this.wallet?.webapp_link&&this.uri)try{this.error=!1;let{webapp_link:t,name:e}=this.wallet,{redirect:o,href:i}=n.j.formatUniversalUrl(t,this.uri);P.ConnectionController.setWcLinking({name:e,href:i}),P.ConnectionController.setRecentWallet(this.wallet),n.j.openHref(o,"_blank")}catch{this.error=!0}}};tZ([(0,r.SB)()],tQ.prototype,"isLoading",void 0),tQ=tZ([(0,c.Mo)("w3m-connecting-wc-web")],tQ);var t0=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let t1=class extends i.oi{constructor(){super(),this.wallet=p.RouterController.state.data?.wallet,this.unsubscribe=[],this.platform=void 0,this.platforms=[],this.isSiwxEnabled=!!l.OptionsController.state.siwx,this.remoteFeatures=l.OptionsController.state.remoteFeatures,this.determinePlatforms(),this.initializeConnection(),this.unsubscribe.push(l.OptionsController.subscribeKey("remoteFeatures",t=>this.remoteFeatures=t))}disconnectedCallback(){this.unsubscribe.forEach(t=>t())}render(){return(0,i.dy)`
      ${this.headerTemplate()}
      <div>${this.platformTemplate()}</div>
      ${this.reownBrandingTemplate()}
    `}reownBrandingTemplate(){return this.remoteFeatures?.reownBranding?(0,i.dy)`<wui-ux-by-reown></wui-ux-by-reown>`:null}async initializeConnection(t=!1){if("browser"!==this.platform&&(!l.OptionsController.state.manualWCControl||t))try{let{wcPairingExpiry:e,status:o}=P.ConnectionController.state;(t||l.OptionsController.state.enableEmbedded||n.j.isPairingExpired(e)||"connecting"===o)&&(await P.ConnectionController.connectWalletConnect(),this.isSiwxEnabled||te.I.close())}catch(t){h.X.sendEvent({type:"track",event:"CONNECT_ERROR",properties:{message:t?.message??"Unknown"}}),P.ConnectionController.setWcError(!0),to.SnackController.showError(t.message??"Connection error"),P.ConnectionController.resetWcConnection(),p.RouterController.goBack()}}determinePlatforms(){if(!this.wallet){this.platforms.push("qrcode"),this.platform="qrcode";return}if(this.platform)return;let{mobile_link:t,desktop_link:e,webapp_link:o,injected:i,rdns:r}=this.wallet,a=i?.map(({injected_id:t})=>t).filter(Boolean),s=[...r?[r]:a??[]],c=!l.OptionsController.state.isUniversalProvider&&s.length,d=P.ConnectionController.checkInstalled(s),u=c&&d,h=e&&!n.j.isMobile();u&&!q.R.state.noAdapters&&this.platforms.push("browser"),t&&this.platforms.push(n.j.isMobile()?"mobile":"qrcode"),o&&this.platforms.push("web"),h&&this.platforms.push("desktop"),u||!c||q.R.state.noAdapters||this.platforms.push("unsupported"),this.platform=this.platforms[0]}platformTemplate(){switch(this.platform){case"browser":return(0,i.dy)`<w3m-connecting-wc-browser></w3m-connecting-wc-browser>`;case"web":return(0,i.dy)`<w3m-connecting-wc-web></w3m-connecting-wc-web>`;case"desktop":return(0,i.dy)`
          <w3m-connecting-wc-desktop .onRetry=${()=>this.initializeConnection(!0)}>
          </w3m-connecting-wc-desktop>
        `;case"mobile":return(0,i.dy)`
          <w3m-connecting-wc-mobile isMobile .onRetry=${()=>this.initializeConnection(!0)}>
          </w3m-connecting-wc-mobile>
        `;case"qrcode":return(0,i.dy)`<w3m-connecting-wc-qrcode></w3m-connecting-wc-qrcode>`;default:return(0,i.dy)`<w3m-connecting-wc-unsupported></w3m-connecting-wc-unsupported>`}}headerTemplate(){return this.platforms.length>1?(0,i.dy)`
      <w3m-connecting-header
        .platforms=${this.platforms}
        .onSelectPlatfrom=${this.onSelectPlatform.bind(this)}
      >
      </w3m-connecting-header>
    `:null}async onSelectPlatform(t){let e=this.shadowRoot?.querySelector("div");e&&(await e.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.platform=t,e.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"}))}};t0([(0,r.SB)()],t1.prototype,"platform",void 0),t0([(0,r.SB)()],t1.prototype,"platforms",void 0),t0([(0,r.SB)()],t1.prototype,"isSiwxEnabled",void 0),t0([(0,r.SB)()],t1.prototype,"remoteFeatures",void 0),t1=t0([(0,c.Mo)("w3m-connecting-wc-view")],t1);var t3=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let t2=class extends i.oi{constructor(){super(...arguments),this.isMobile=n.j.isMobile()}render(){if(this.isMobile){let{featured:t,recommended:e}=a.ApiController.state,{customWallets:o}=l.OptionsController.state,r=s.M.getRecentWallets(),n=t.length||e.length||o?.length||r.length;return(0,i.dy)`<wui-flex
        flexDirection="column"
        gap="xs"
        .margin=${["3xs","s","s","s"]}
      >
        ${n?(0,i.dy)`<w3m-connector-list></w3m-connector-list>`:null}
        <w3m-all-wallets-widget></w3m-all-wallets-widget>
      </wui-flex>`}return(0,i.dy)`<wui-flex flexDirection="column" .padding=${["0","0","l","0"]}>
      <w3m-connecting-wc-view></w3m-connecting-wc-view>
      <wui-flex flexDirection="column" .padding=${["0","m","0","m"]}>
        <w3m-all-wallets-widget></w3m-all-wallets-widget> </wui-flex
    ></wui-flex>`}};t3([(0,r.SB)()],t2.prototype,"isMobile",void 0),t2=t3([(0,c.Mo)("w3m-connecting-wc-basic-view")],t2);var t5=o(81997),t4=o(52144),t6=o(42216);let t8=()=>new t7;class t7{}let t9=new WeakMap,et=(0,t6.XM)(class extends t4.sR{render(t){return t5.Ld}update(t,[e]){let o=e!==this.G;return o&&void 0!==this.G&&this.rt(void 0),(o||this.lt!==this.ct)&&(this.G=e,this.ht=t.options?.host,this.rt(this.ct=t.element)),t5.Ld}rt(t){if(this.isConnected||(t=void 0),"function"==typeof this.G){let e=this.ht??globalThis,o=t9.get(e);void 0===o&&(o=new WeakMap,t9.set(e,o)),void 0!==o.get(this.G)&&this.G.call(this.ht,void 0),o.set(this.G,t),void 0!==t&&this.G.call(this.ht,t)}else this.G.value=t}get lt(){return"function"==typeof this.G?t9.get(this.ht??globalThis)?.get(this.G):this.G?.value}disconnected(){this.lt===this.ct&&this.rt(void 0)}reconnected(){this.rt(this.ct)}});var ee=(0,i.iv)`
  :host {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  label {
    position: relative;
    display: inline-block;
    width: 32px;
    height: 22px;
  }

  input {
    width: 0;
    height: 0;
    opacity: 0;
  }

  span {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--wui-color-blue-100);
    border-width: 1px;
    border-style: solid;
    border-color: var(--wui-color-gray-glass-002);
    border-radius: 999px;
    transition:
      background-color var(--wui-ease-inout-power-1) var(--wui-duration-md),
      border-color var(--wui-ease-inout-power-1) var(--wui-duration-md);
    will-change: background-color, border-color;
  }

  span:before {
    position: absolute;
    content: '';
    height: 16px;
    width: 16px;
    left: 3px;
    top: 2px;
    background-color: var(--wui-color-inverse-100);
    transition: transform var(--wui-ease-inout-power-1) var(--wui-duration-lg);
    will-change: transform;
    border-radius: 50%;
  }

  input:checked + span {
    border-color: var(--wui-color-gray-glass-005);
    background-color: var(--wui-color-blue-100);
  }

  input:not(:checked) + span {
    background-color: var(--wui-color-gray-glass-010);
  }

  input:checked + span:before {
    transform: translateX(calc(100% - 7px));
  }
`,eo=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let ei=class extends i.oi{constructor(){super(...arguments),this.inputElementRef=t8(),this.checked=void 0}render(){return(0,i.dy)`
      <label>
        <input
          ${et(this.inputElementRef)}
          type="checkbox"
          ?checked=${(0,d.o)(this.checked)}
          @change=${this.dispatchChangeEvent.bind(this)}
        />
        <span></span>
      </label>
    `}dispatchChangeEvent(){this.dispatchEvent(new CustomEvent("switchChange",{detail:this.inputElementRef.value?.checked,bubbles:!0,composed:!0}))}};ei.styles=[g.ET,g.ZM,g.Bp,ee],eo([(0,r.Cb)({type:Boolean})],ei.prototype,"checked",void 0),ei=eo([(0,w.M)("wui-switch")],ei);var er=(0,i.iv)`
  :host {
    height: 100%;
  }

  button {
    display: flex;
    align-items: center;
    justify-content: center;
    column-gap: var(--wui-spacing-1xs);
    padding: var(--wui-spacing-xs) var(--wui-spacing-s);
    background-color: var(--wui-color-gray-glass-002);
    border-radius: var(--wui-border-radius-xs);
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-002);
    transition: background-color var(--wui-ease-out-power-1) var(--wui-duration-md);
    will-change: background-color;
    cursor: pointer;
  }

  wui-switch {
    pointer-events: none;
  }
`,en=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let ea=class extends i.oi{constructor(){super(...arguments),this.checked=void 0}render(){return(0,i.dy)`
      <button>
        <wui-icon size="xl" name="walletConnectBrown"></wui-icon>
        <wui-switch ?checked=${(0,d.o)(this.checked)}></wui-switch>
      </button>
    `}};ea.styles=[g.ET,g.ZM,er],en([(0,r.Cb)({type:Boolean})],ea.prototype,"checked",void 0),ea=en([(0,w.M)("wui-certified-switch")],ea);var el=(0,i.iv)`
  button {
    background-color: var(--wui-color-fg-300);
    border-radius: var(--wui-border-radius-4xs);
    width: 16px;
    height: 16px;
  }

  button:disabled {
    background-color: var(--wui-color-bg-300);
  }

  wui-icon {
    color: var(--wui-color-bg-200) !important;
  }

  button:focus-visible {
    background-color: var(--wui-color-fg-250);
    border: 1px solid var(--wui-color-accent-100);
  }

  @media (hover: hover) and (pointer: fine) {
    button:hover:enabled {
      background-color: var(--wui-color-fg-250);
    }

    button:active:enabled {
      background-color: var(--wui-color-fg-225);
    }
  }
`,es=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let ec=class extends i.oi{constructor(){super(...arguments),this.icon="copy"}render(){return(0,i.dy)`
      <button>
        <wui-icon color="inherit" size="xxs" name=${this.icon}></wui-icon>
      </button>
    `}};ec.styles=[g.ET,g.ZM,el],es([(0,r.Cb)()],ec.prototype,"icon",void 0),ec=es([(0,w.M)("wui-input-element")],ec);var ed=o(89906),eu=(0,i.iv)`
  :host {
    position: relative;
    width: 100%;
    display: inline-block;
    color: var(--wui-color-fg-275);
  }

  input {
    width: 100%;
    border-radius: var(--wui-border-radius-xs);
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-002);
    background: var(--wui-color-gray-glass-002);
    font-size: var(--wui-font-size-paragraph);
    letter-spacing: var(--wui-letter-spacing-paragraph);
    color: var(--wui-color-fg-100);
    transition:
      background-color var(--wui-ease-inout-power-1) var(--wui-duration-md),
      border-color var(--wui-ease-inout-power-1) var(--wui-duration-md),
      box-shadow var(--wui-ease-inout-power-1) var(--wui-duration-md);
    will-change: background-color, border-color, box-shadow;
    caret-color: var(--wui-color-accent-100);
  }

  input:disabled {
    cursor: not-allowed;
    border: 1px solid var(--wui-color-gray-glass-010);
  }

  input:disabled::placeholder,
  input:disabled + wui-icon {
    color: var(--wui-color-fg-300);
  }

  input::placeholder {
    color: var(--wui-color-fg-275);
  }

  input:focus:enabled {
    background-color: var(--wui-color-gray-glass-005);
    -webkit-box-shadow:
      inset 0 0 0 1px var(--wui-color-accent-100),
      0px 0px 0px 4px var(--wui-box-shadow-blue);
    -moz-box-shadow:
      inset 0 0 0 1px var(--wui-color-accent-100),
      0px 0px 0px 4px var(--wui-box-shadow-blue);
    box-shadow:
      inset 0 0 0 1px var(--wui-color-accent-100),
      0px 0px 0px 4px var(--wui-box-shadow-blue);
  }

  input:hover:enabled {
    background-color: var(--wui-color-gray-glass-005);
  }

  wui-icon {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
  }

  .wui-size-sm {
    padding: 9px var(--wui-spacing-m) 10px var(--wui-spacing-s);
  }

  wui-icon + .wui-size-sm {
    padding: 9px var(--wui-spacing-m) 10px 36px;
  }

  wui-icon[data-input='sm'] {
    left: var(--wui-spacing-s);
  }

  .wui-size-md {
    padding: 15px var(--wui-spacing-m) var(--wui-spacing-l) var(--wui-spacing-m);
  }

  wui-icon + .wui-size-md,
  wui-loading-spinner + .wui-size-md {
    padding: 10.5px var(--wui-spacing-3xl) 10.5px var(--wui-spacing-3xl);
  }

  wui-icon[data-input='md'] {
    left: var(--wui-spacing-l);
  }

  .wui-size-lg {
    padding: var(--wui-spacing-s) var(--wui-spacing-s) var(--wui-spacing-s) var(--wui-spacing-l);
    letter-spacing: var(--wui-letter-spacing-medium-title);
    font-size: var(--wui-font-size-medium-title);
    font-weight: var(--wui-font-weight-light);
    line-height: 130%;
    color: var(--wui-color-fg-100);
    height: 64px;
  }

  .wui-padding-right-xs {
    padding-right: var(--wui-spacing-xs);
  }

  .wui-padding-right-s {
    padding-right: var(--wui-spacing-s);
  }

  .wui-padding-right-m {
    padding-right: var(--wui-spacing-m);
  }

  .wui-padding-right-l {
    padding-right: var(--wui-spacing-l);
  }

  .wui-padding-right-xl {
    padding-right: var(--wui-spacing-xl);
  }

  .wui-padding-right-2xl {
    padding-right: var(--wui-spacing-2xl);
  }

  .wui-padding-right-3xl {
    padding-right: var(--wui-spacing-3xl);
  }

  .wui-padding-right-4xl {
    padding-right: var(--wui-spacing-4xl);
  }

  .wui-padding-right-5xl {
    padding-right: var(--wui-spacing-5xl);
  }

  wui-icon + .wui-size-lg,
  wui-loading-spinner + .wui-size-lg {
    padding-left: 50px;
  }

  wui-icon[data-input='lg'] {
    left: var(--wui-spacing-l);
  }

  .wui-size-mdl {
    padding: 17.25px var(--wui-spacing-m) 17.25px var(--wui-spacing-m);
  }
  wui-icon + .wui-size-mdl,
  wui-loading-spinner + .wui-size-mdl {
    padding: 17.25px var(--wui-spacing-3xl) 17.25px 40px;
  }
  wui-icon[data-input='mdl'] {
    left: var(--wui-spacing-m);
  }

  input:placeholder-shown ~ ::slotted(wui-input-element),
  input:placeholder-shown ~ ::slotted(wui-icon) {
    opacity: 0;
    pointer-events: none;
  }

  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  input[type='number'] {
    -moz-appearance: textfield;
  }

  ::slotted(wui-input-element),
  ::slotted(wui-icon) {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
  }

  ::slotted(wui-input-element) {
    right: var(--wui-spacing-m);
  }

  ::slotted(wui-icon) {
    right: 0px;
  }
`,eh=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let ep=class extends i.oi{constructor(){super(...arguments),this.inputElementRef=t8(),this.size="md",this.disabled=!1,this.placeholder="",this.type="text",this.value=""}render(){let t=`wui-padding-right-${this.inputRightPadding}`,e={[`wui-size-${this.size}`]:!0,[t]:!!this.inputRightPadding};return(0,i.dy)`${this.templateIcon()}
      <input
        data-testid="wui-input-text"
        ${et(this.inputElementRef)}
        class=${(0,ed.$)(e)}
        type=${this.type}
        enterkeyhint=${(0,d.o)(this.enterKeyHint)}
        ?disabled=${this.disabled}
        placeholder=${this.placeholder}
        @input=${this.dispatchInputChangeEvent.bind(this)}
        .value=${this.value||""}
        tabindex=${(0,d.o)(this.tabIdx)}
      />
      <slot></slot>`}templateIcon(){return this.icon?(0,i.dy)`<wui-icon
        data-input=${this.size}
        size=${this.size}
        color="inherit"
        name=${this.icon}
      ></wui-icon>`:null}dispatchInputChangeEvent(){this.dispatchEvent(new CustomEvent("inputChange",{detail:this.inputElementRef.value?.value,bubbles:!0,composed:!0}))}};ep.styles=[g.ET,g.ZM,eu],eh([(0,r.Cb)()],ep.prototype,"size",void 0),eh([(0,r.Cb)()],ep.prototype,"icon",void 0),eh([(0,r.Cb)({type:Boolean})],ep.prototype,"disabled",void 0),eh([(0,r.Cb)()],ep.prototype,"placeholder",void 0),eh([(0,r.Cb)()],ep.prototype,"type",void 0),eh([(0,r.Cb)()],ep.prototype,"keyHint",void 0),eh([(0,r.Cb)()],ep.prototype,"value",void 0),eh([(0,r.Cb)()],ep.prototype,"inputRightPadding",void 0),eh([(0,r.Cb)()],ep.prototype,"tabIdx",void 0),ep=eh([(0,w.M)("wui-input-text")],ep);var eg=(0,i.iv)`
  :host {
    position: relative;
    display: inline-block;
    width: 100%;
  }
`;let ew=class extends i.oi{constructor(){super(...arguments),this.inputComponentRef=t8()}render(){return(0,i.dy)`
      <wui-input-text
        ${et(this.inputComponentRef)}
        placeholder="Search wallet"
        icon="search"
        type="search"
        enterKeyHint="search"
        size="sm"
      >
        <wui-input-element @click=${this.clearValue} icon="close"></wui-input-element>
      </wui-input-text>
    `}clearValue(){let t=this.inputComponentRef.value,e=t?.inputElementRef.value;e&&(e.value="",e.focus(),e.dispatchEvent(new Event("input")))}};ew.styles=[g.ET,eg],ew=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a}([(0,w.M)("wui-search-bar")],ew);let ef=(0,i.YP)`<svg  viewBox="0 0 48 54" fill="none">
  <path
    d="M43.4605 10.7248L28.0485 1.61089C25.5438 0.129705 22.4562 0.129705 19.9515 1.61088L4.53951 10.7248C2.03626 12.2051 0.5 14.9365 0.5 17.886V36.1139C0.5 39.0635 2.03626 41.7949 4.53951 43.2752L19.9515 52.3891C22.4562 53.8703 25.5438 53.8703 28.0485 52.3891L43.4605 43.2752C45.9637 41.7949 47.5 39.0635 47.5 36.114V17.8861C47.5 14.9365 45.9637 12.2051 43.4605 10.7248Z"
  />
</svg>`;var eb=(0,i.iv)`
  :host {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 104px;
    row-gap: var(--wui-spacing-xs);
    padding: var(--wui-spacing-xs) 10px;
    background-color: var(--wui-color-gray-glass-002);
    border-radius: clamp(0px, var(--wui-border-radius-xs), 20px);
    position: relative;
  }

  wui-shimmer[data-type='network'] {
    border: none;
    -webkit-clip-path: var(--wui-path-network);
    clip-path: var(--wui-path-network);
  }

  svg {
    position: absolute;
    width: 48px;
    height: 54px;
    z-index: 1;
  }

  svg > path {
    stroke: var(--wui-color-gray-glass-010);
    stroke-width: 1px;
  }

  @media (max-width: 350px) {
    :host {
      width: 100%;
    }
  }
`,ev=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let em=class extends i.oi{constructor(){super(...arguments),this.type="wallet"}render(){return(0,i.dy)`
      ${this.shimmerTemplate()}
      <wui-shimmer width="56px" height="20px" borderRadius="xs"></wui-shimmer>
    `}shimmerTemplate(){return"network"===this.type?(0,i.dy)` <wui-shimmer
          data-type=${this.type}
          width="48px"
          height="54px"
          borderRadius="xs"
        ></wui-shimmer>
        ${ef}`:(0,i.dy)`<wui-shimmer width="56px" height="56px" borderRadius="xs"></wui-shimmer>`}};em.styles=[g.ET,g.ZM,eb],ev([(0,r.Cb)()],em.prototype,"type",void 0),em=ev([(0,w.M)("wui-card-select-loader")],em);var ey=o(3874),ex=(0,i.iv)`
  :host {
    display: grid;
    width: inherit;
    height: inherit;
  }
`,eC=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let e$=class extends i.oi{render(){return this.style.cssText=`
      grid-template-rows: ${this.gridTemplateRows};
      grid-template-columns: ${this.gridTemplateColumns};
      justify-items: ${this.justifyItems};
      align-items: ${this.alignItems};
      justify-content: ${this.justifyContent};
      align-content: ${this.alignContent};
      column-gap: ${this.columnGap&&`var(--wui-spacing-${this.columnGap})`};
      row-gap: ${this.rowGap&&`var(--wui-spacing-${this.rowGap})`};
      gap: ${this.gap&&`var(--wui-spacing-${this.gap})`};
      padding-top: ${this.padding&&ey.H.getSpacingStyles(this.padding,0)};
      padding-right: ${this.padding&&ey.H.getSpacingStyles(this.padding,1)};
      padding-bottom: ${this.padding&&ey.H.getSpacingStyles(this.padding,2)};
      padding-left: ${this.padding&&ey.H.getSpacingStyles(this.padding,3)};
      margin-top: ${this.margin&&ey.H.getSpacingStyles(this.margin,0)};
      margin-right: ${this.margin&&ey.H.getSpacingStyles(this.margin,1)};
      margin-bottom: ${this.margin&&ey.H.getSpacingStyles(this.margin,2)};
      margin-left: ${this.margin&&ey.H.getSpacingStyles(this.margin,3)};
    `,(0,i.dy)`<slot></slot>`}};e$.styles=[g.ET,ex],eC([(0,r.Cb)()],e$.prototype,"gridTemplateRows",void 0),eC([(0,r.Cb)()],e$.prototype,"gridTemplateColumns",void 0),eC([(0,r.Cb)()],e$.prototype,"justifyItems",void 0),eC([(0,r.Cb)()],e$.prototype,"alignItems",void 0),eC([(0,r.Cb)()],e$.prototype,"justifyContent",void 0),eC([(0,r.Cb)()],e$.prototype,"alignContent",void 0),eC([(0,r.Cb)()],e$.prototype,"columnGap",void 0),eC([(0,r.Cb)()],e$.prototype,"rowGap",void 0),eC([(0,r.Cb)()],e$.prototype,"gap",void 0),eC([(0,r.Cb)()],e$.prototype,"padding",void 0),eC([(0,r.Cb)()],e$.prototype,"margin",void 0),e$=eC([(0,w.M)("wui-grid")],e$);var ek=(0,i.iv)`
  button {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    width: 104px;
    row-gap: var(--wui-spacing-xs);
    padding: var(--wui-spacing-s) var(--wui-spacing-0);
    background-color: var(--wui-color-gray-glass-002);
    border-radius: clamp(0px, var(--wui-border-radius-xs), 20px);
    transition:
      color var(--wui-duration-lg) var(--wui-ease-out-power-1),
      background-color var(--wui-duration-lg) var(--wui-ease-out-power-1),
      border-radius var(--wui-duration-lg) var(--wui-ease-out-power-1);
    will-change: background-color, color, border-radius;
    outline: none;
    border: none;
  }

  button > wui-flex > wui-text {
    color: var(--wui-color-fg-100);
    max-width: 86px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    justify-content: center;
  }

  button > wui-flex > wui-text.certified {
    max-width: 66px;
  }

  button:hover:enabled {
    background-color: var(--wui-color-gray-glass-005);
  }

  button:disabled > wui-flex > wui-text {
    color: var(--wui-color-gray-glass-015);
  }

  [data-selected='true'] {
    background-color: var(--wui-color-accent-glass-020);
  }

  @media (hover: hover) and (pointer: fine) {
    [data-selected='true']:hover:enabled {
      background-color: var(--wui-color-accent-glass-015);
    }
  }

  [data-selected='true']:active:enabled {
    background-color: var(--wui-color-accent-glass-010);
  }

  @media (max-width: 350px) {
    button {
      width: 100%;
    }
  }
`,eR=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let eE=class extends i.oi{constructor(){super(),this.observer=new IntersectionObserver(()=>void 0),this.visible=!1,this.imageSrc=void 0,this.imageLoading=!1,this.wallet=void 0,this.observer=new IntersectionObserver(t=>{t.forEach(t=>{t.isIntersecting?(this.visible=!0,this.fetchImageSrc()):this.visible=!1})},{threshold:.01})}firstUpdated(){this.observer.observe(this)}disconnectedCallback(){this.observer.disconnect()}render(){let t=this.wallet?.badge_type==="certified";return(0,i.dy)`
      <button>
        ${this.imageTemplate()}
        <wui-flex flexDirection="row" alignItems="center" justifyContent="center" gap="3xs">
          <wui-text
            variant="tiny-500"
            color="inherit"
            class=${(0,d.o)(t?"certified":void 0)}
            >${this.wallet?.name}</wui-text
          >
          ${t?(0,i.dy)`<wui-icon size="sm" name="walletConnectBrown"></wui-icon>`:null}
        </wui-flex>
      </button>
    `}imageTemplate(){return(this.visible||this.imageSrc)&&!this.imageLoading?(0,i.dy)`
      <wui-wallet-image
        size="md"
        imageSrc=${(0,d.o)(this.imageSrc)}
        name=${this.wallet?.name}
        .installed=${this.wallet?.installed}
        badgeSize="sm"
      >
      </wui-wallet-image>
    `:this.shimmerTemplate()}shimmerTemplate(){return(0,i.dy)`<wui-shimmer width="56px" height="56px" borderRadius="xs"></wui-shimmer>`}async fetchImageSrc(){this.wallet&&(this.imageSrc=I.f.getWalletImage(this.wallet),this.imageSrc||(this.imageLoading=!0,this.imageSrc=await I.f.fetchWalletImage(this.wallet.image_id),this.imageLoading=!1))}};eE.styles=ek,eR([(0,r.SB)()],eE.prototype,"visible",void 0),eR([(0,r.SB)()],eE.prototype,"imageSrc",void 0),eR([(0,r.SB)()],eE.prototype,"imageLoading",void 0),eR([(0,r.Cb)()],eE.prototype,"wallet",void 0),eE=eR([(0,c.Mo)("w3m-all-wallets-list-item")],eE);var eI=(0,i.iv)`
  wui-grid {
    max-height: clamp(360px, 400px, 80vh);
    overflow: scroll;
    scrollbar-width: none;
    grid-auto-rows: min-content;
    grid-template-columns: repeat(auto-fill, 104px);
  }

  @media (max-width: 350px) {
    wui-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  wui-grid[data-scroll='false'] {
    overflow: hidden;
  }

  wui-grid::-webkit-scrollbar {
    display: none;
  }

  wui-loading-spinner {
    padding-top: var(--wui-spacing-l);
    padding-bottom: var(--wui-spacing-l);
    justify-content: center;
    grid-column: 1 / span 4;
  }
`,eS=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let eT="local-paginator",ej=class extends i.oi{constructor(){super(),this.unsubscribe=[],this.paginationObserver=void 0,this.loading=!a.ApiController.state.wallets.length,this.wallets=a.ApiController.state.wallets,this.recommended=a.ApiController.state.recommended,this.featured=a.ApiController.state.featured,this.filteredWallets=a.ApiController.state.filteredWallets,this.unsubscribe.push(a.ApiController.subscribeKey("wallets",t=>this.wallets=t),a.ApiController.subscribeKey("recommended",t=>this.recommended=t),a.ApiController.subscribeKey("featured",t=>this.featured=t),a.ApiController.subscribeKey("filteredWallets",t=>this.filteredWallets=t))}firstUpdated(){this.initialFetch(),this.createPaginationObserver()}disconnectedCallback(){this.unsubscribe.forEach(t=>t()),this.paginationObserver?.disconnect()}render(){return(0,i.dy)`
      <wui-grid
        data-scroll=${!this.loading}
        .padding=${["0","s","s","s"]}
        columnGap="xxs"
        rowGap="l"
        justifyContent="space-between"
      >
        ${this.loading?this.shimmerTemplate(16):this.walletsTemplate()}
        ${this.paginationLoaderTemplate()}
      </wui-grid>
    `}async initialFetch(){this.loading=!0;let t=this.shadowRoot?.querySelector("wui-grid");t&&(await a.ApiController.fetchWalletsByPage({page:1}),await t.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.loading=!1,t.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"}))}shimmerTemplate(t,e){return[...Array(t)].map(()=>(0,i.dy)`
        <wui-card-select-loader type="wallet" id=${(0,d.o)(e)}></wui-card-select-loader>
      `)}walletsTemplate(){let t=this.filteredWallets?.length>0?n.j.uniqueBy([...this.featured,...this.recommended,...this.filteredWallets],"id"):n.j.uniqueBy([...this.featured,...this.recommended,...this.wallets],"id");return H.J.markWalletsAsInstalled(t).map(t=>(0,i.dy)`
        <w3m-all-wallets-list-item
          @click=${()=>this.onConnectWallet(t)}
          .wallet=${t}
        ></w3m-all-wallets-list-item>
      `)}paginationLoaderTemplate(){let{wallets:t,recommended:e,featured:o,count:i}=a.ApiController.state,r=window.innerWidth<352?3:4,n=t.length+e.length,l=Math.ceil(n/r)*r-n+r;return(l-=t.length?o.length%r:0,0===i&&o.length>0)?null:0===i||[...o,...t,...e].length<i?this.shimmerTemplate(l,eT):null}createPaginationObserver(){let t=this.shadowRoot?.querySelector(`#${eT}`);t&&(this.paginationObserver=new IntersectionObserver(([t])=>{if(t?.isIntersecting&&!this.loading){let{page:t,count:e,wallets:o}=a.ApiController.state;o.length<e&&a.ApiController.fetchWalletsByPage({page:t+1})}}),this.paginationObserver.observe(t))}onConnectWallet(t){u.ConnectorController.selectWalletConnector(t)}};ej.styles=eI,eS([(0,r.SB)()],ej.prototype,"loading",void 0),eS([(0,r.SB)()],ej.prototype,"wallets",void 0),eS([(0,r.SB)()],ej.prototype,"recommended",void 0),eS([(0,r.SB)()],ej.prototype,"featured",void 0),eS([(0,r.SB)()],ej.prototype,"filteredWallets",void 0),ej=eS([(0,c.Mo)("w3m-all-wallets-list")],ej);var eP=(0,i.iv)`
  wui-grid,
  wui-loading-spinner,
  wui-flex {
    height: 360px;
  }

  wui-grid {
    overflow: scroll;
    scrollbar-width: none;
    grid-auto-rows: min-content;
    grid-template-columns: repeat(auto-fill, 104px);
  }

  wui-grid[data-scroll='false'] {
    overflow: hidden;
  }

  wui-grid::-webkit-scrollbar {
    display: none;
  }

  wui-loading-spinner {
    justify-content: center;
    align-items: center;
  }

  @media (max-width: 350px) {
    wui-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
`,eO=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let eB=class extends i.oi{constructor(){super(...arguments),this.prevQuery="",this.prevBadge=void 0,this.loading=!0,this.query=""}render(){return this.onSearch(),this.loading?(0,i.dy)`<wui-loading-spinner color="accent-100"></wui-loading-spinner>`:this.walletsTemplate()}async onSearch(){(this.query.trim()!==this.prevQuery.trim()||this.badge!==this.prevBadge)&&(this.prevQuery=this.query,this.prevBadge=this.badge,this.loading=!0,await a.ApiController.searchWallet({search:this.query,badge:this.badge}),this.loading=!1)}walletsTemplate(){let{search:t}=a.ApiController.state,e=H.J.markWalletsAsInstalled(t);return t.length?(0,i.dy)`
      <wui-grid
        data-testid="wallet-list"
        .padding=${["0","s","s","s"]}
        rowGap="l"
        columnGap="xs"
        justifyContent="space-between"
      >
        ${e.map(t=>(0,i.dy)`
            <w3m-all-wallets-list-item
              @click=${()=>this.onConnectWallet(t)}
              .wallet=${t}
              data-testid="wallet-search-item-${t.id}"
            ></w3m-all-wallets-list-item>
          `)}
      </wui-grid>
    `:(0,i.dy)`
        <wui-flex
          data-testid="no-wallet-found"
          justifyContent="center"
          alignItems="center"
          gap="s"
          flexDirection="column"
        >
          <wui-icon-box
            size="lg"
            iconColor="fg-200"
            backgroundColor="fg-300"
            icon="wallet"
            background="transparent"
          ></wui-icon-box>
          <wui-text data-testid="no-wallet-found-text" color="fg-200" variant="paragraph-500">
            No Wallet found
          </wui-text>
        </wui-flex>
      `}onConnectWallet(t){u.ConnectorController.selectWalletConnector(t)}};eB.styles=eP,eO([(0,r.SB)()],eB.prototype,"loading",void 0),eO([(0,r.Cb)()],eB.prototype,"query",void 0),eO([(0,r.Cb)()],eB.prototype,"badge",void 0),eB=eO([(0,c.Mo)("w3m-all-wallets-search")],eB);var eA=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let eL=class extends i.oi{constructor(){super(...arguments),this.search="",this.onDebouncedSearch=n.j.debounce(t=>{this.search=t})}render(){let t=this.search.length>=2;return(0,i.dy)`
      <wui-flex .padding=${["0","s","s","s"]} gap="xs">
        <wui-search-bar @inputChange=${this.onInputChange.bind(this)}></wui-search-bar>
        <wui-certified-switch
          ?checked=${this.badge}
          @click=${this.onClick.bind(this)}
          data-testid="wui-certified-switch"
        ></wui-certified-switch>
        ${this.qrButtonTemplate()}
      </wui-flex>
      ${t||this.badge?(0,i.dy)`<w3m-all-wallets-search
            query=${this.search}
            badge=${(0,d.o)(this.badge)}
          ></w3m-all-wallets-search>`:(0,i.dy)`<w3m-all-wallets-list badge=${(0,d.o)(this.badge)}></w3m-all-wallets-list>`}
    `}onInputChange(t){this.onDebouncedSearch(t.detail)}onClick(){if("certified"===this.badge){this.badge=void 0;return}this.badge="certified",to.SnackController.showSvg("Only WalletConnect certified",{icon:"walletConnectBrown",iconColor:"accent-100"})}qrButtonTemplate(){return n.j.isMobile()?(0,i.dy)`
        <wui-icon-box
          size="lg"
          iconSize="xl"
          iconColor="accent-100"
          backgroundColor="accent-100"
          icon="qrCode"
          background="transparent"
          border
          borderColor="wui-accent-glass-010"
          @click=${this.onWalletConnectQr.bind(this)}
        ></wui-icon-box>
      `:null}onWalletConnectQr(){p.RouterController.push("ConnectingWalletConnect")}};eA([(0,r.SB)()],eL.prototype,"search",void 0),eA([(0,r.SB)()],eL.prototype,"badge",void 0),eL=eA([(0,c.Mo)("w3m-all-wallets-view")],eL);var eM=(0,i.iv)`
  button {
    column-gap: var(--wui-spacing-s);
    padding: 11px 18px 11px var(--wui-spacing-s);
    width: 100%;
    background-color: var(--wui-color-gray-glass-002);
    border-radius: var(--wui-border-radius-xs);
    color: var(--wui-color-fg-250);
    transition:
      color var(--wui-ease-out-power-1) var(--wui-duration-md),
      background-color var(--wui-ease-out-power-1) var(--wui-duration-md);
    will-change: color, background-color;
  }

  button[data-iconvariant='square'],
  button[data-iconvariant='square-blue'] {
    padding: 6px 18px 6px 9px;
  }

  button > wui-flex {
    flex: 1;
  }

  button > wui-image {
    width: 32px;
    height: 32px;
    box-shadow: 0 0 0 2px var(--wui-color-gray-glass-005);
    border-radius: var(--wui-border-radius-3xl);
  }

  button > wui-icon {
    width: 36px;
    height: 36px;
    transition: opacity var(--wui-ease-out-power-1) var(--wui-duration-md);
    will-change: opacity;
  }

  button > wui-icon-box[data-variant='blue'] {
    box-shadow: 0 0 0 2px var(--wui-color-accent-glass-005);
  }

  button > wui-icon-box[data-variant='overlay'] {
    box-shadow: 0 0 0 2px var(--wui-color-gray-glass-005);
  }

  button > wui-icon-box[data-variant='square-blue'] {
    border-radius: var(--wui-border-radius-3xs);
    position: relative;
    border: none;
    width: 36px;
    height: 36px;
  }

  button > wui-icon-box[data-variant='square-blue']::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    border-radius: inherit;
    border: 1px solid var(--wui-color-accent-glass-010);
    pointer-events: none;
  }

  button > wui-icon:last-child {
    width: 14px;
    height: 14px;
  }

  button:disabled {
    color: var(--wui-color-gray-glass-020);
  }

  button[data-loading='true'] > wui-icon {
    opacity: 0;
  }

  wui-loading-spinner {
    position: absolute;
    right: 18px;
    top: 50%;
    transform: translateY(-50%);
  }
`,ez=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a};let eW=class extends i.oi{constructor(){super(...arguments),this.tabIdx=void 0,this.variant="icon",this.disabled=!1,this.imageSrc=void 0,this.alt=void 0,this.chevron=!1,this.loading=!1}render(){return(0,i.dy)`
      <button
        ?disabled=${!!this.loading||!!this.disabled}
        data-loading=${this.loading}
        data-iconvariant=${(0,d.o)(this.iconVariant)}
        tabindex=${(0,d.o)(this.tabIdx)}
      >
        ${this.loadingTemplate()} ${this.visualTemplate()}
        <wui-flex gap="3xs">
          <slot></slot>
        </wui-flex>
        ${this.chevronTemplate()}
      </button>
    `}visualTemplate(){if("image"===this.variant&&this.imageSrc)return(0,i.dy)`<wui-image src=${this.imageSrc} alt=${this.alt??"list item"}></wui-image>`;if("square"===this.iconVariant&&this.icon&&"icon"===this.variant)return(0,i.dy)`<wui-icon name=${this.icon}></wui-icon>`;if("icon"===this.variant&&this.icon&&this.iconVariant){let t=["blue","square-blue"].includes(this.iconVariant)?"accent-100":"fg-200",e="square-blue"===this.iconVariant?"mdl":"md",o=this.iconSize?this.iconSize:e;return(0,i.dy)`
        <wui-icon-box
          data-variant=${this.iconVariant}
          icon=${this.icon}
          iconSize=${o}
          background="transparent"
          iconColor=${t}
          backgroundColor=${t}
          size=${e}
        ></wui-icon-box>
      `}return null}loadingTemplate(){return this.loading?(0,i.dy)`<wui-loading-spinner
        data-testid="wui-list-item-loading-spinner"
        color="fg-300"
      ></wui-loading-spinner>`:(0,i.dy)``}chevronTemplate(){return this.chevron?(0,i.dy)`<wui-icon size="inherit" color="fg-200" name="chevronRight"></wui-icon>`:null}};eW.styles=[g.ET,g.ZM,eM],ez([(0,r.Cb)()],eW.prototype,"icon",void 0),ez([(0,r.Cb)()],eW.prototype,"iconSize",void 0),ez([(0,r.Cb)()],eW.prototype,"tabIdx",void 0),ez([(0,r.Cb)()],eW.prototype,"variant",void 0),ez([(0,r.Cb)()],eW.prototype,"iconVariant",void 0),ez([(0,r.Cb)({type:Boolean})],eW.prototype,"disabled",void 0),ez([(0,r.Cb)()],eW.prototype,"imageSrc",void 0),ez([(0,r.Cb)()],eW.prototype,"alt",void 0),ez([(0,r.Cb)({type:Boolean})],eW.prototype,"chevron",void 0),ez([(0,r.Cb)({type:Boolean})],eW.prototype,"loading",void 0),eW=ez([(0,w.M)("wui-list-item")],eW);let eN=class extends i.oi{constructor(){super(...arguments),this.wallet=p.RouterController.state.data?.wallet}render(){if(!this.wallet)throw Error("w3m-downloads-view");return(0,i.dy)`
      <wui-flex gap="xs" flexDirection="column" .padding=${["s","s","l","s"]}>
        ${this.chromeTemplate()} ${this.iosTemplate()} ${this.androidTemplate()}
        ${this.homepageTemplate()}
      </wui-flex>
    `}chromeTemplate(){return this.wallet?.chrome_store?(0,i.dy)`<wui-list-item
      variant="icon"
      icon="chromeStore"
      iconVariant="square"
      @click=${this.onChromeStore.bind(this)}
      chevron
    >
      <wui-text variant="paragraph-500" color="fg-100">Chrome Extension</wui-text>
    </wui-list-item>`:null}iosTemplate(){return this.wallet?.app_store?(0,i.dy)`<wui-list-item
      variant="icon"
      icon="appStore"
      iconVariant="square"
      @click=${this.onAppStore.bind(this)}
      chevron
    >
      <wui-text variant="paragraph-500" color="fg-100">iOS App</wui-text>
    </wui-list-item>`:null}androidTemplate(){return this.wallet?.play_store?(0,i.dy)`<wui-list-item
      variant="icon"
      icon="playStore"
      iconVariant="square"
      @click=${this.onPlayStore.bind(this)}
      chevron
    >
      <wui-text variant="paragraph-500" color="fg-100">Android App</wui-text>
    </wui-list-item>`:null}homepageTemplate(){return this.wallet?.homepage?(0,i.dy)`
      <wui-list-item
        variant="icon"
        icon="browser"
        iconVariant="square-blue"
        @click=${this.onHomePage.bind(this)}
        chevron
      >
        <wui-text variant="paragraph-500" color="fg-100">Website</wui-text>
      </wui-list-item>
    `:null}onChromeStore(){this.wallet?.chrome_store&&n.j.openHref(this.wallet.chrome_store,"_blank")}onAppStore(){this.wallet?.app_store&&n.j.openHref(this.wallet.app_store,"_blank")}onPlayStore(){this.wallet?.play_store&&n.j.openHref(this.wallet.play_store,"_blank")}onHomePage(){this.wallet?.homepage&&n.j.openHref(this.wallet.homepage,"_blank")}};eN=function(t,e,o,i){var r,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,o,i);else for(var l=t.length-1;l>=0;l--)(r=t[l])&&(a=(n<3?r(a):n>3?r(e,o,a):r(e,o))||a);return n>3&&a&&Object.defineProperty(e,o,a),a}([(0,c.Mo)("w3m-downloads-view")],eN)}}]);