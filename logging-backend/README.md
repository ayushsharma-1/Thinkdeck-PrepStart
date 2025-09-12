# Logging Backend

A centralized logging system for the Interview Application with RabbitMQ streaming and real-time WebSocket updates.

## Features

- **RabbitMQ Integration**: Collect logs from all services via message queue
- **Real-time WebSocket**: Live log streaming to connected clients
- **Log Aggregation**: Process and store logs with filtering and search
- **Web Dashboard**: Interactive dashboard for viewing logs with filters
- **REST API**: RESTful endpoints for log management
- **Statistics**: Real-time metrics and log statistics

## Quick Start

1. **Install Dependencies**:
   ```bash
   cd logging-backend
   npm install
   ```

2. **Configure Environment**:
   - Copy `.env` file and update RabbitMQ credentials
   - Set up RabbitMQ instance (CloudAMQP recommended)

3. **Start the Service**:
   ```bash
   npm run dev  # Development with auto-restart
   npm start    # Production
   ```

4. **Access Dashboard**:
   - Open http://localhost:5002/dashboard
   - WebSocket available at ws://localhost:5002

## Architecture

### Services

- **RabbitMQ Service**: Message queue integration for log collection
- **Log Aggregator**: Process, filter, and store logs in memory
- **WebSocket Service**: Real-time log broadcasting to connected clients

### Log Format

All logs follow the format: **SERVICE TYPE, WHICH, STATE, DEPENDENCY, FILE**

```json
{
  "service_type": "frontend-client",
  "which": "InterviewPage",
  "state": "loading",
  "dependency": "api",
  "file": "InterviewPage.jsx",
  "message": "Loading first question...",
  "level": "info",
  "metadata": {},
  "timestamp": "2025-01-10T12:00:00.000Z"
}
```

## API Endpoints

### REST API

- `GET /health` - Service health check
- `GET /api/logs` - Get filtered logs
- `GET /api/stats` - Get log statistics  
- `DELETE /api/logs` - Clear all logs

### WebSocket Events

#### Client → Server
- `subscribe_logs` - Subscribe to log streaming
- `unsubscribe_logs` - Unsubscribe from log streaming
- `update_filters` - Update log filters
- `get_stats` - Request statistics
- `get_logs` - Request logs with parameters

#### Server → Client
- `connected` - Connection confirmation
- `new_log` - New log entry
- `initial_logs` - Initial log batch
- `filtered_logs` - Filtered log results
- `stats_update` - Statistics update

## Integration with Other Services

### Frontend Client (Next.js)

Add RabbitMQ publisher to send logs:

```javascript
const RabbitMQLogger = require('./utils/rabbitmq-logger');

// Initialize
const logger = new RabbitMQLogger('frontend-client');

// Log usage
logger.log('InterviewPage', 'loading', 'api', 'InterviewPage.jsx', 'Loading first question...');
```

### Backend Server (Node.js)

```javascript
const RabbitMQLogger = require('./utils/rabbitmq-logger');

// Initialize
const logger = new RabbitMQLogger('backend-server');

// Log usage  
logger.log('session', 'creating', 'mongodb', 'session.js', 'Creating new interview session');
```

### Backend FastAPI (Python)

```python
from utils.rabbitmq_logger import RabbitMQLogger

# Initialize
logger = RabbitMQLogger('backend-fastapi')

# Log usage
logger.log('ai_service', 'generating', 'groq_api', 'ai_service.py', 'Generating AI question')
```

## Configuration

### Environment Variables

```env
# Server Configuration
PORT=5002
NODE_ENV=development

# RabbitMQ Configuration  
RABBITMQ_URL=amqps://user:pass@host/vhost
RABBITMQ_QUEUE_NAME=interview_logs
RABBITMQ_EXCHANGE_NAME=interview_logs_exchange
RABBITMQ_ROUTING_KEY=logs.all

# Log Configuration
MAX_LOG_HISTORY=10000
LOG_RETENTION_HOURS=24
```

### RabbitMQ Setup

1. Create account at CloudAMQP or use local RabbitMQ
2. Create exchange: `interview_logs_exchange` (type: topic)  
3. Create queue: `interview_logs`
4. Bind queue to exchange with routing key: `logs.all`

## Dashboard Features

- **Real-time Log Streaming**: Live updates as logs arrive
- **Filtering**: By service, level, time range, and search terms
- **Statistics**: Log counts, error rates, service metrics
- **Auto-scroll**: Automatic scrolling to latest logs
- **Responsive Design**: Works on desktop and mobile

## Monitoring

The service provides comprehensive monitoring:

- **Connection Status**: RabbitMQ and WebSocket health
- **Performance Metrics**: Memory usage, log processing rates
- **Error Tracking**: Failed log processing and connections
- **Client Management**: Connected clients and their filters

## Development

### Adding New Log Sources

1. Install RabbitMQ client in your service
2. Create logger utility with SERVICE TYPE format
3. Send logs to `interview_logs_exchange` with routing key `logs.all`
4. Logs will automatically appear in dashboard

### Extending Functionality

- Add new filters in `log-aggregator.js`
- Extend WebSocket events in `websocket-service.js` 
- Add new API endpoints in `server.js`
- Customize dashboard in `public/dashboard.html`

## Production Deployment

1. **Environment**: Set `NODE_ENV=production`
2. **RabbitMQ**: Use dedicated instance with authentication
3. **Load Balancing**: Run multiple instances behind load balancer
4. **Monitoring**: Integrate with APM tools (New Relic, DataDog)
5. **Security**: Enable HTTPS and proper CORS settings

## Troubleshooting

### Common Issues

1. **RabbitMQ Connection Failed**:
   - Verify RABBITMQ_URL is correct
   - Check network connectivity
   - Verify exchange and queue exist

2. **WebSocket Not Connecting**:
   - Check CORS configuration
   - Verify port is not blocked
   - Check browser console for errors

3. **Logs Not Appearing**:
   - Verify RabbitMQ message routing
   - Check log format matches expected schema
   - Verify exchange bindings

### Debug Mode

Enable debug logging:

```bash
DEBUG=* npm start
```

### Health Check

Monitor service health:

```bash
curl http://localhost:5002/health
```

## License

MIT License - See LICENSE file for details.