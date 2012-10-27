var http = require('http');
var io = require('socket.io');
var util = require('util');
var pcap = require('pcap');

server = http.createServer(ServerMain);
server.listen('8082');

var filter = 'port ! (38338 or  8800 or 13337)';
var session = pcap.createSession("eth0", filter);
var socket = io.listen(server);

socket.on('connection', NewClient);
session.on("packet", queuePacket);

var clients = new Array();
var tmpPacket;
var packetQueue = new Array();

setInterval(broadcastPackets, 1500);

function ServerMain(req, res)
{
	res.writeHead(200, {'Content-Type': 'text/html'});

	var pageData = '';

	pageData += '\
		<html><head> \
		<script src="/socket.io/socket.io.js"></script> \
		</head><body> \
		<div id="pcap"></div><br> \
		<script> \
			var socket = io.connect("/"); \
			var element; \
\
			function recvMsg(data) \
			{ \
				element = document.getElementById("pcap"); \
				element.innerHTML = data.data+element.innerHTML; \
				clipMsg(element); \
			} \
\
			function clipMsg(element) \
			{ \
				var tmpData = ""; \
				tmpData = element.innerHTML.split("<br>").splice(0,100).join("<br>"); \
				element.innerHTML = tmpData; \
			} \
\
			socket.on("pcapentry", recvMsg); \
		</script> \
		</body></html> \
	';

	res.end(pageData);
}

function NewClient(client)
{
	client.on('disconnect', function()
	{
		console.log('Client '+this.id+' Disconnected');
		clients = clients.splice(this);
	});

	client.id = clients.length+1;

	console.log('Client '+client.id+' Connected');

	clients.push(client);
}

function queuePacket(packet)
{
	packet = pcap.decode.packet(packet);
	tmpPacket = pcap.print.packet(packet);

	packetQueue.push(tmpPacket);
}

function broadcastPackets()
{
	tmpPacket = '';

	if(packetQueue.length > 0)
	{
		for(packet in packetQueue)
		{
			tmpPacket += packetQueue[packet]+"<br>";
		}

		clients.every(
			function(entry)
			{
				entry.volatile.emit('pcapentry', { data: tmpPacket });
				entry.broadcast.volatile.emit('pcapentry', { data: tmpPacket });

				return false;
			}
		);
	}

	packetQueue = [];
}
