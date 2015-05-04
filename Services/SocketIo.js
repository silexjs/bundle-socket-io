var http = require('http');


var SocketIo = function(kernel, containerService, dispatcherService, configService, logService) {
	this.containerService = containerService;
	this.dispatcherService = dispatcherService;
	this.logService = logService;
	
	this.debug = kernel.debug;
	this.config = configService.get('socket');
	this.servers = [];
	
	this.socketIoServer = require('socket.io');
	this.socketIoClient = require('socket.io-client');
};
SocketIo.prototype = {
	containerService: null,
	dispatcherService: null,
	logService: null,
	
	calledOnKernelReady: false,
	debug: null,
	config: null,
	servers: null,
	
	socketIoServer: null,
	socketIoClient: null,
	
	log: function(m) {
		this.logService.debug('Socket.Io', m);
	},
	
	onHttpServerCreated: function(next) {
		if(this.config.server.useSilexHttpServerBundle !== false) {
			var self = this;
			var ports = this.containerService.get('http.server').ports;
			for(var i in ports) {
				this.createSocketIoServer(ports[i].server, ports[i]);
			}
		}
		this.onKernelReady(next);
	},
	onKernelReady: function(next) {
		if(this.calledOnKernelReady === true) {
			next();
			return;
		} else {
			this.calledOnKernelReady = true;
		}
		if(this.config.server.ports !== undefined) {
			for(var i in this.config.server.ports) {
				var port = this.config.server.ports[i];
				var server = http.createServer();
				this.createSocketIoServer(server, port);
				server.listen(port.port, (port.ip||null));
			}
		}
		next();
	},
	
	createSocketIoServer: function(server, config) {
		this.log('New server ('+((config.ip!==undefined&&config.ip!==null)?config.ip:'*')+':'+config.port+')');
		var self = this;
		var io = this.socketIoServer(server, this.config.server.config || {});
		if(this.config.server.redis !== undefined) {
			io.adapter(require('socket.io-redis')(this.config.server.redis));
		}
		io.on('connection', function(socket) {
			socket.on('disconnect', function() {
				if(self.debug === true) {
					var d = new Date;
					self.log('Left user ('+d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()+' '+d.getHours()+':'+d.getMinutes()+':'+d.getSeconds()+'.'+d.getMilliseconds()+' | ID: '+socket.client.id+')');
				}
			});
			self.onIoConnection(socket, io);
		});
		this.servers.push(io);
		this.dispatcherService.dispatch('socket.server.created', [io]);
	},
	
	onIoConnection: function(socket, io) {
		if(this.debug === true) {
			var d = new Date;
			this.log('New user ('+d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()+' '+d.getHours()+':'+d.getMinutes()+':'+d.getSeconds()+'.'+d.getMilliseconds()+' | ID: '+socket.client.id+')');
		}
		this.dispatcherService.dispatch('socket.server.connection', [socket, io]);
	},
};


module.exports = SocketIo;
