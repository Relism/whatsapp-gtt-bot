const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');
const {
	Client,
	LocalAuth
} = require('whatsapp-web.js');

require('date-time-format-timezone');

let time = new Intl.DateTimeFormat('it', {
	timeZone: 'Europe/Rome',
	hour: 'numeric',
	minute: 'numeric',
}).format(new Date());

function minutesDifference(time1, time2) {
	let difference
	let minutes1 = time1.substring(3, 5)
	let minutes2 = time2.substring(3, 5)
	let hours1 = time1.substring(0, 2)
	let hours2 = parseInt(time2.substring(0, 2), 10)
	if (hours1 > hours2) {
		hours2 = hours2 + 24
	}
	if (hours1 == hours2 && minutes1 != minutes2) {
		let justMinutes = parseInt(minutes2) - parseInt(minutes1)
		if (justMinutes == 1) {
			difference = "Fra 1 minuto"
		} else {
			difference = "Fra " + justMinutes + " minuti"
		}
	} else if (hours1 == hours2 && minutes1 == minutes2) {
		difference = "Sta passando ora"
	} else {
		let sum1 = parseInt(hours1) * 60 + parseInt(minutes1)
		let sum2 = parseInt(hours2) * 60 + parseInt(minutes2)
		let subtraction = sum2 - sum1
		if (subtraction > 60) {
			let fraction = subtraction / 60
			let remainder = fraction % 1
			let remainingMinutes = Math.round(remainder * 60)
			let remainingHours = Math.round(fraction - remainder)
			if (remainingHours == 1) {
				difference = "Fra 1 ora, " + remainingMinutes + " minuti"
			} else if (remainingHours > 1) {
				difference = "Fra " + remainingHours + " ore, " + remainingMinutes + " minuti"
			}
		} else {
			difference = "Fra " + subtraction + " minuti"
		}
	}
	return difference
}

function formatData(rawdata) {
	let info = ""
	let length = rawdata[0].length
	let nBus = length / 3
	for (i = 0; i < nBus; i++) {
		let trackcounter
		let bus = i + 1
		let counter = i * 3
		trackcounter = 0

		info = info + "───────────────" + "\r\n"

		//start second loop
		for (j = counter; j < counter + 3; j++) {
			if (trackcounter == 0) {
				var line = rawdata[0][j]
				info = info + "*Linea* : " + line + "\r\n"
			}
			if (trackcounter == 1) {
				var destination = rawdata[0][j]
				info = info + "*Destinazione* : _" + destination + "_\r\n"
			}
			if (trackcounter == 2) {
				var orario = rawdata[0][j]
				info = info + "*Passa alle* : " + orario + "\r\n"
				var rawtime = orario.substring(0, 5);
				info = info + minutesDifference(time.toString(), rawtime) + "\r\n"
			}
			trackcounter++
			//end second loop
		}
		//end first loop
	}
	info = info + "───────────────"
	return info
}

function newLog(logContent){
    fs.appendFile('file.txt', logContent + "\r\n", 'utf-8', err => {
        if (err) {
          throw err;
        }
    });
}

const client = new Client({
	authStrategy: new LocalAuth(),
});

client.initialize();

client.on('qr', (qr) => {
	qrcode.generate(qr, {
		small: true
	});
});

client.on('authenticated', () => {
	console.log('AUTHENTICATED');
});

client.on('ready', () => {
	console.log('Client is ready!');
});

client.on('message', (message) => {
	rawMessage = message.body
	rawAuthor = message.from
	messaggio = rawMessage.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '');
	author = rawAuthor.slice(0, -5);
	api_token = process.env.api_token
	if (messaggio.startsWith("fermata") || messaggio.startsWith("Fermata")) {
		if (messaggio.startsWith("fermata")) {
			fermata = messaggio.replace('fermata ', '')
		} else if (messaggio.startsWith("Fermata")) {
			fermata = messaggio.replace('Fermata ', '')
		}
		axios.get('https://gttapi.relism.repl.co/?token=' + api_token + '&fermata=' + fermata).then(resp => {
			var data = resp.data
			if (data != "No such stop found") {
				message.reply(formatData(data))
				newLog("+" + author + " has requested and acquired data for bus " + fermata)
			} else {
				message.reply('Nessuna fermata "' + fermata + '" trovata.')
				newLog("+" + author + " has requested data for bus " + fermata + " which was not found.")
			}
		});
	}
});
