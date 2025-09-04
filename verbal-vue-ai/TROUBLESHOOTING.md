# 🔧 Troubleshooting Guide

This guide covers common issues and solutions for the Verbal Vue AI platform.

## 🚀 Quick Diagnostic Commands

Before diving into specific issues, run these diagnostic commands:

```bash
# Check system status
curl http://localhost:8000/api/health

# Verify Docker services
docker-compose ps

# Check logs
docker-compose logs -f backend
docker-compose logs -f mongodb

# Database connection test
docker exec -it verbal-vue-ai-mongodb-1 mongosh --eval "db.adminCommand('ismaster')"
```

## 📊 Common Issues & Solutions

### 🌐 Frontend Issues

#### Issue: Frontend not connecting to backend
**Symptoms:**
- API calls fail with CORS errors
- Network errors in browser console
- Components showing loading states indefinitely

**Solutions:**
```bash
# 1. Check environment variables
cat .env
# Ensure VITE_API_BASE_URL=http://localhost:8000/api

# 2. Verify backend is running
curl http://localhost:8000/api/health

# 3. Check CORS configuration
# In backend/src/server.ts, ensure:
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

# 4. Clear browser cache and restart dev server
npm run dev
```

#### Issue: Components not rendering properly
**Symptoms:**
- Blank screens
- TypeScript errors
- Missing UI components

**Solutions:**
```bash
# 1. Check dependencies
npm list react react-dom @types/react

# 2. Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# 3. Check TypeScript configuration
npx tsc --noEmit

# 4. Verify component imports
grep -r "import.*from.*components" src/
```

#### Issue: Build failures
**Symptoms:**
- Vite build errors
- TypeScript compilation errors
- Missing dependencies

**Solutions:**
```bash
# 1. Update dependencies
npm update

# 2. Check for peer dependency issues
npm ls --depth=0

# 3. Build with verbose output
npm run build -- --verbose

# 4. Clear Vite cache
rm -rf node_modules/.vite
npm run build
```

### 🖥️ Backend Issues

#### Issue: Server won't start
**Symptoms:**
- Port already in use errors
- Module not found errors
- Database connection failures

**Solutions:**
```bash
# 1. Check if port 8000 is in use
netstat -tulpn | grep :8000
# Kill process if needed: kill -9 <PID>

# 2. Verify environment variables
cat backend/.env
# Required: MONGODB_URI, OPENAI_API_KEY, ASSEMBLYAI_API_KEY

# 3. Install backend dependencies
cd backend && npm install

# 4. Compile TypeScript
cd backend && npm run build

# 5. Check Node.js version (requires 18+)
node --version
```

#### Issue: Database connection failures
**Symptoms:**
- MongoDB connection timeout
- Authentication failures
- Database not found errors

**Solutions:**
```bash
# 1. Verify MongoDB is running
docker ps | grep mongo

# 2. Check MongoDB logs
docker logs verbal-vue-ai-mongodb-1

# 3. Test connection manually
docker exec -it verbal-vue-ai-mongodb-1 mongosh

# 4. Verify connection string
echo $MONGODB_URI
# Should be: mongodb://admin:password123@mongodb:27017/verbalvueai?authSource=admin

# 5. Reset database if needed
docker-compose down -v
docker-compose up -d mongodb
```

#### Issue: TypeScript compilation errors
**Symptoms:**
- tsc errors during build
- Import/export errors
- Type definition conflicts

**Solutions:**
```bash
# 1. Check TypeScript configuration
cd backend && cat tsconfig.json

# 2. Install missing type definitions
npm install --save-dev @types/node @types/express @types/mongoose

# 3. Clear TypeScript cache
npx tsc --build --clean

# 4. Fix import paths
# Use absolute imports: import { User } from '@/models/User'
```

### 🤖 AI Service Issues

#### Issue: OpenAI API failures
**Symptoms:**
- Interview questions not generating
- Code evaluation failing
- API rate limit errors

**Solutions:**
```bash
# 1. Verify API key
echo $OPENAI_API_KEY
# Should start with 'sk-'

# 2. Test API directly
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models

# 3. Check rate limits
# Free tier: 3 RPM, Paid tier: 60 RPM
# Consider implementing exponential backoff

# 4. Update API configuration
# In backend/src/services/ai.service.ts:
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID, // Optional
});
```

#### Issue: AssemblyAI speech-to-text failures
**Symptoms:**
- Audio transcription not working
- Upload timeouts
- Poor transcription quality

**Solutions:**
```bash
# 1. Verify API key
echo $ASSEMBLYAI_API_KEY

# 2. Test API directly
curl -H "authorization: $ASSEMBLYAI_API_KEY" \
  https://api.assemblyai.com/v2/transcript

# 3. Check audio file format
# Supported: wav, mp3, mp4, m4a, flac
file uploads/audio.wav

# 4. Optimize audio settings
# Recommended: 16kHz, mono, PCM format
```

### 🐳 Docker Issues

#### Issue: Containers not starting
**Symptoms:**
- Exit code errors
- Out of memory errors
- Port binding failures

**Solutions:**
```bash
# 1. Check Docker daemon
docker info

# 2. Verify compose file syntax
docker-compose config

# 3. Check resource usage
docker stats

# 4. Clean up unused resources
docker system prune -a

# 5. Restart with fresh containers
docker-compose down --remove-orphans
docker-compose up --force-recreate
```

#### Issue: Code execution timeouts
**Symptoms:**
- Long-running code execution
- Container creation failures
- Resource limit exceeded

**Solutions:**
```bash
# 1. Check Docker container limits
docker inspect container_name | grep -A 5 "Memory\|Cpu"

# 2. Increase timeout settings
# In backend/.env:
DOCKER_EXECUTION_TIMEOUT=60000
MAX_CONCURRENT_EXECUTIONS=5

# 3. Monitor container resource usage
docker stats --no-stream

# 4. Clean up orphaned containers
docker container prune -f
```

### 🗄️ Database Issues

#### Issue: MongoDB performance problems
**Symptoms:**
- Slow query responses
- Connection pool exhaustion
- Memory usage warnings

**Solutions:**
```bash
# 1. Check database indexes
docker exec -it verbal-vue-ai-mongodb-1 mongosh verbalvueai --eval "db.runCommand({listIndexes: 'mcqquestions'})"

# 2. Create missing indexes
# In backend/src/models/MCQQuestion.ts:
schema.index({ company: 1, difficulty: 1, category: 1 });

# 3. Monitor database performance
docker exec -it verbal-vue-ai-mongodb-1 mongosh --eval "db.serverStatus()"

# 4. Optimize connection pool
# In backend/src/config/database.ts:
mongoose.connect(MONGODB_URI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

#### Issue: Data consistency problems
**Symptoms:**
- Duplicate records
- Missing relationships
- Validation errors

**Solutions:**
```bash
# 1. Run data validation
npm run seed:validate

# 2. Check for orphaned documents
docker exec -it verbal-vue-ai-mongodb-1 mongosh verbalvueai --eval "
  db.interviewsessions.find({ companyId: { \$exists: false } }).count()
"

# 3. Repair data relationships
npm run db:repair

# 4. Re-run database seeding
npm run seed
```

## 🔧 Performance Optimization

### Frontend Performance

```typescript
// 1. Code splitting
import { lazy, Suspense } from 'react';
const MockInterview = lazy(() => import('./components/MockInterview'));

// 2. Memoization
const MemoizedComponent = React.memo(({ data }) => {
  return <div>{data}</div>;
});

// 3. Virtual scrolling for large lists
import { FixedSizeList as List } from 'react-window';

// 4. Debounced API calls
import { debounce } from 'lodash';
const debouncedSearch = debounce(searchFunction, 300);
```

### Backend Performance

```typescript
// 1. Query optimization
const questions = await MCQQuestion.find({ company })
  .select('question options difficulty category')
  .lean(); // Use lean() for read-only queries

// 2. Caching
import { Redis } from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

// 3. Connection pooling
mongoose.connect(uri, {
  maxPoolSize: 10,
  bufferMaxEntries: 0
});

// 4. Compression
app.use(compression());
```

### Database Performance

```bash
# 1. Proper indexing
db.mcqquestions.createIndex({ company: 1, difficulty: 1 })
db.interviewsessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7200 })

# 2. Query optimization
db.mcqquestions.find({ company: "google" }).explain("executionStats")

# 3. Aggregation pipeline optimization
db.mcqquestions.aggregate([
  { $match: { company: "google" } },
  { $sample: { size: 20 } }
])
```

## 📝 Logging & Monitoring

### Application Logs

```bash
# Backend logs
tail -f backend/logs/app.log

# Error logs
tail -f backend/logs/error.log

# Docker logs
docker-compose logs -f --tail=100 backend

# Database logs
docker-compose logs -f --tail=100 mongodb
```

### Health Monitoring

```bash
# System health check
curl http://localhost:8000/api/health/detailed

# Database health
curl http://localhost:8000/api/health/database

# AI services health
curl http://localhost:8000/api/health/ai-services

# Performance metrics
curl http://localhost:8000/api/metrics
```

### Error Tracking

```typescript
// Frontend error boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
    // Send to monitoring service
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}
```

## 🔐 Security Issues

### Common Security Problems

```bash
# 1. Check for exposed secrets
grep -r "api_key\|password\|secret" . --exclude-dir=node_modules

# 2. Verify CORS configuration
curl -H "Origin: http://malicious-site.com" http://localhost:8000/api/health

# 3. Test rate limiting
for i in {1..200}; do curl http://localhost:8000/api/health; done

# 4. Check file upload security
file uploads/test-file.exe
```

### Security Hardening

```typescript
// 1. Input sanitization
import validator from 'validator';
const sanitizedInput = validator.escape(userInput);

// 2. Rate limiting per user
import rateLimit from 'express-rate-limit';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// 3. Secure headers
import helmet from 'helmet';
app.use(helmet());

// 4. Code execution sandboxing
docker run --rm --network=none --memory=128m --cpus=0.5 \
  -v /tmp/code:/code:ro node:18-alpine timeout 30s node /code/solution.js
```

## 🚑 Emergency Recovery

### Database Recovery

```bash
# 1. Backup current database
docker exec verbal-vue-ai-mongodb-1 mongodump --out /backup

# 2. Restore from backup
docker exec verbal-vue-ai-mongodb-1 mongorestore /backup

# 3. Reset to factory defaults
docker-compose down -v
docker-compose up -d
npm run seed
```

### System Recovery

```bash
# 1. Complete system reset
docker-compose down --remove-orphans -v
docker system prune -a
git clean -fdx
npm install
cd backend && npm install
docker-compose up --build

# 2. Rollback to previous version
git log --oneline
git checkout <commit-hash>
docker-compose up --build
```

## 📞 Getting Help

### Debug Information Collection

```bash
# System info
echo "OS: $(uname -a)"
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"
echo "Docker: $(docker --version)"

# Application info
curl -s http://localhost:8000/api/health/detailed | jq '.'

# Resource usage
docker stats --no-stream
df -h
free -h
```

### Support Channels

1. **GitHub Issues**: Create detailed bug reports with debug info
2. **Documentation**: Check README.md and API_ENDPOINTS.md
3. **Logs**: Include relevant logs from both frontend and backend
4. **Environment**: Specify development/production environment

## 🧪 Testing Issues

### Unit Test Failures

```bash
# 1. Clear test cache
npm test -- --clearCache

# 2. Run tests with verbose output
npm test -- --verbose

# 3. Run specific test file
npm test -- api.test.ts

# 4. Debug test environment
NODE_ENV=test npm test
```

### Integration Test Issues

```bash
# 1. Start test database
docker-compose -f docker-compose.test.yml up -d

# 2. Run integration tests
npm run test:integration

# 3. Check test database state
docker exec -it test-mongodb mongosh verbalvueai-test
```

This comprehensive troubleshooting guide should help you resolve most issues you might encounter while working with the Verbal Vue AI platform. Remember to check logs first, verify configurations, and follow the systematic approach outlined here.
