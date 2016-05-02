const readline = require('readline');
var fs = require('fs');
var NodeRSA = require('node-rsa');
var path = require('path'); 
var uuid = require('node-uuid');
var socket;
var the_server_key;
var connected = 0;
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

var cryptokeys = process.env.HOME + "/.cryptochat";
try {
	stats = fs.lstatSync(cryptokeys);
	try {
		if (fs.statSync(cryptokeys+'/server.keys')) {
			console.log("Keys Found!");
		}
	} catch (e) {
		console.log("No Server Keys Found, Please Remove: " + cryptokeys);
		process.exit(1);
	}
	//load them...
	var server_key_txt = fs.readFileSync(cryptokeys+'/server.keys','utf8');
	var server_key = new NodeRSA(server_key_txt);
	connect();
} catch (e) {
	//console.log(e);
	//process.exit(1);
	console.log("Going to Generate Keys, Please Wait!");
	var key = new NodeRSA();
	key.generateKeyPair(4096);
	var private_key = key.exportKey();
	fs.mkdirSync(cryptokeys);
	var keys = private_key
	fs.writeFileSync(cryptokeys+'/server.keys',keys);
	//we have to create a new node.lst also, since we just started ;'(
	fs.writeFileSync(cryptokeys+'/node.lst',"cryptochat.com");
	var server_key_txt = fs.readFileSync(cryptokeys+'/server.keys','utf8');
	var server_key = new NodeRSA(server_key_txt);
	fs.writeFileSync(cryptokeys+'/uuid',uuid.v4());
	connect();
}



console.log("Welcome to Crypto Chat CLI");
console.log("Please Wait, we are connecting you to peers");
if (connected == 1) {
	getInput();
}


function connect () {
	var nodes = fs.readFileSync(cryptokeys+'/node.lst','utf8');
	var lines = nodes.split('\n');
	var node = lines[Math.floor(Math.random()*lines.length)];
	socket = require('socket.io-client')('http://'+node+':8080');
	socket.enc = 0;
	socket.on('connect', function(){
		socket.emit("uuid",'{"uuid":"'+fs.readFileSync(cryptokeys+'/uuid','utf8')+'"}');
		if (connected == 1) {
			getInput();
		}
	});
	socket.on('pong', function(data){
		if (connected == 1) {
			getInput();
		}
	});
	socket.on('enc', function(data){
		try {
			var enc = server_key.decrypt(data);
			var json = JSON.parse(enc);
	        	var command = json.command;
			//console.log("Command: " + json.command);
			if (json.command == "relay-serverenc") {
				if (json.subcommand == "message") {
					var friend_key_txt = fs.readFileSync(cryptokeys+'/'+json.from,'utf8');
					var friend_key = new NodeRSA(friend_key_txt);
					var enc = friend_key.decrypt(json.message,'utf8');
					console.log("\nFrom " + json.from + ": " + enc);
				}
				if (json.subcommand == "tradekeysresponse") {
					fs.writeFileSync(cryptokeys+'/'+json.from+".pub",json.publickey);
				}
				if (json.subcommand == "tradekeys") {
					fs.writeFileSync(cryptokeys+'/'+json.from+".pub",json.publickey);
					try {
						if (!fs.statSync(cryptokeys+'/'+json.from)) {
							try {
								console.log("\n>> Making Key For: " + json.from);
								var key = new NodeRSA();
								key.generateKeyPair(4096);
								var private_key = key.exportKey();
								var keys = private_key
								fs.writeFileSync(cryptokeys+'/'+json.from,keys);
							} catch (e) {
								console.log("Error: FileSync " + e);
							}
						} else {
							console.log("We already made keys for: " + json.from);
						}
					} catch (e) {
                                                console.log("\n>> Making Key For: " + json.from);
                                                var key = new NodeRSA();
                                                key.generateKeyPair(4096);
                                                var private_key = key.exportKey();
                                                var keys = private_key
                                        	fs.writeFileSync(cryptokeys+'/'+json.from,keys);
					}
					try {
						var friend_key_txt = fs.readFileSync(cryptokeys+'/'+json.from,'utf8');
						var friend_key = new NodeRSA(friend_key_txt);
						var friendpub = friend_key.exportKey('public');
						friendpub = friendpub.replace(/(\r\n|\n|\r)/gm,"");
						var output = socket.key.encrypt('{"command":"relay-serverenc","user":"'+json.from+'","subcommand":"tradekeysresponse","publickey":"'+friendpub+'"}');
						socket.emit('enc',output);
					} catch (e) {
						console.log("Error Opening Friend Key " + e);
					}
				}
			}
			if (json.command == "pong") {
				var end = new Date() - socket.startTime;
				console.log("\n>> Response Time: " + end +"ms");
			}
			if (json.command == "time") {
				console.log("\n>> Time: " + json.time);
			}
			if (json.command == "online") {
				console.log("\n>> Total: " + json.count);
			}
			if (json.command == "sendkey") {
				if (json.count == 0) {
					console.log("\n>> Couldn't Find: " + json.user);
				} else {
                                	var friend_key_txt = fs.readFileSync(cryptokeys+'/'+json.from,'utf8');
                                	var friend_key = new NodeRSA(friend_key_txt);
                                	var friendpub = friend_key.exportKey('public');
                                	friendpub = friendpub.replace(/(\r\n|\n|\r)/gm,"");
                                	console.log('{"command":"relay-serverenc","user":"'+json.from+'","public-key":"'+friendpub+'"}');
                                	var output = socket.key.encrypt('{"command":"relay-serverenc","user":"'+json.from+'","public-key":"'+friendpub+'"}');
                                	socket.emit('enc',output);
				}
			}
			if (json.command == "verifyuser") {
				if (json.count == 0) {
					console.log("\n>> Couldn't Find: " + json.user);
				} else {
					//make the key now
					try {
						if (!fs.statSync(cryptokeys+'/'+json.user)) {
							try {
								console.log("\n>> Making Key For: " + json.user);
								var key = new NodeRSA();
								key.generateKeyPair(4096);
								var private_key = key.exportKey();
								var keys = private_key
								fs.writeFileSync(cryptokeys+'/'+json.user,keys);
							} catch (e) {
								console.log("Error: FileSync " + e);
							}
						} else {
							console.log("We already made keys for: " + json.user);
						}
					} catch (e) {
                                                console.log("\n>> Making Key For: " + json.user);
                                                var key = new NodeRSA();
                                                key.generateKeyPair(4096);
                                                var private_key = key.exportKey();
                                                var keys = private_key
                                        	fs.writeFileSync(cryptokeys+'/'+json.user,keys);
					}
					try {
						var friend_key_txt = fs.readFileSync(cryptokeys+'/'+json.user,'utf8');
						var friend_key = new NodeRSA(friend_key_txt);
						var friendpub = friend_key.exportKey('public');
						friendpub = friendpub.replace(/(\r\n|\n|\r)/gm,"");
						var output = socket.key.encrypt('{"command":"relay-serverenc","user":"'+json.user+'","subcommand":"tradekeys","publickey":"'+friendpub+'"}');
						socket.emit('enc',output);
					} catch (e) {
						console.log("Error Opening Friend Key " + e);
					}
				}
			}
		} catch (e) {
			console.log("Error decrypting!! " + e);
		}
		if (connected == 1) {
			getInput();
		}
	});
	socket.on('server-public', function(data){
		var json = JSON.parse(data);
		var mypub = server_key.exportKey('public');
		socket.mykey = server_key;
		mypub = mypub.replace(/(\r\n|\n|\r)/gm,"");
		socket.emit("public-key",'{"key":"'+mypub+'"}');
		the_server_key = new NodeRSA(json.key);
		socket.key = the_server_key;
		socket.enc = 1;
		connected = 1;
		console.log("Connected! Feel Free To Chat It Up!");
		if (connected == 1) {
			getInput();
		}
	});


}

function getInput() {
	rl.question('> ', (command) => {
		if (command == "get time") {
			try {
				if (socket.enc == 1) {
					var output = socket.key.encrypt('{"command":"gettime"}');
					socket.emit('enc',output);
				}
			} catch (e) {
				console.log("Can't get time right now");
			}
		}
		if (command == "get all users") {
			try {
				if (socket.enc == 1) {
					var output = socket.key.encrypt('{"command":"gettotalonlineusers"}');
					socket.emit('enc',output);
				}
			} catch (e) {
				console.log("Can't get time right now");
			}
		}

		if (command == "get public server key") {
			try {
				console.log(socket.key.exportKey('public'));
			} catch (e) {
				console.log("Sorry, I couldn't find the key yet!");
			}
		}
		if (command == "get my public key") {
			try {
				console.log(socket.mykey.exportKey('public'));
			} catch (e) {
				console.log("Sorry, I couldn't find the key yet!");
			}
		}
		if (command == "senduuid") {
			socket.emit("uuid",'{"uuid":"'+fs.readFileSync(cryptokeys+'/uuid','utf8')+'"}');
		}
		if (command == "ping") {
			socket.startTime = new Date();
			if (socket.enc == 1) {
				var output = socket.key.encrypt('{"command":"pingy"}');
				socket.emit('enc',output);
			} else {
				socket.emit("pingy",'{}');
			}
		}
		if (command == "get my uuid") {
			console.log(fs.readFileSync(cryptokeys+'/uuid','utf8'));
		}
		if (command == "quit") {
			console.log("Thanks for flying!");
			process.exit(0);
		}
		if (startsWith(command, 'send message ')) {
			var res = command.split(" ");
			var message;
			if (res.length > 3) {
				for (var i =3;i<res.length;i++) {
					message = res[i] +" ";
				}
			}
			try {
				message = message.substring(0, message.length - 1);
                        	var friend_key_txt = fs.readFileSync(cryptokeys+'/'+res[2]+'.pub','utf8');
                        	var friend_key = new NodeRSA(friend_key_txt);
				var message = friend_key.encrypt(message,'base64');
				var uuid = fs.readFileSync(cryptokeys+'/uuid','utf8');
				var output = socket.key.encrypt('{"command":"relay-serverenc","from":"'+uuid+'","user":"'+res[2]+'","subcommand":"message","message":"'+message+'"}');
				socket.emit('enc',output);

			} catch (e) {
				console.log("Error Sending Message: " + e);
			}
		}
		if (startsWith(command, 'trade keys ')) {
			var res = command.split(" ");
			if (res.length == 3) {
				console.log("Trading Keys with " + res[2]);
				if (socket.enc == 1) {
					var output = socket.key.encrypt('{"command":"verifyuser","user":"'+res[2]+'"}');
					socket.emit('enc',output);
				}
			} else {
				console.log("Unknown person to trade with...");
			}
		}

		if (connected == 1) {
			getInput();
		}
	});
}


function startsWith(tvar,searchString){
    if (tvar.indexOf(searchString) == 0){
         return true;
    }
    return false;
}
