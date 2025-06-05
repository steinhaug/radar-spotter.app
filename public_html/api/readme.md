# Radar Navigation API - Mock Backend

## Directory Structure
```
/api/
├── .htaccess              # URL routing and CORS
├── common.php             # Shared utilities and mock data
├── options.php            # CORS preflight handler
├── error.php              # 404 handler
├── pins/
│   ├── all.php           # GET /api/pins/all
│   ├── changes.php       # GET /api/pins/changes
│   └── details.php       # GET /api/pins/{id}/details
├── route/
│   └── scan.php          # POST /api/route/scan
├── reports/
│   ├── pin-alert.php     # POST /api/reports/pin-alert
│   └── route-created.php # POST /api/reports/route-created
└── logs/                 # Activity logs (auto-created)
    ├── activity.log
    ├── pin_alerts.json
    └── route_reports.json
```

## API Endpoints

### PIN Management
- `GET /api/pins/all` - Get all active pins
- `GET /api/pins/changes?since=2025-01-08T10:00:00Z` - Get changes since timestamp
- `GET /api/pins/{pinId}/details` - Get detailed pin information

### Route Analysis
- `POST /api/route/scan` - Scan route for pins within tolerance

### Reporting
- `POST /api/reports/pin-alert` - Report PIN alert/notification
- `POST /api/reports/route-created` - Report route creation

## Mock Data
- **~10 test pins** across Norway (Agder, Oslo, Bergen, Trondheim, Sweden border)
- **Realistic coordinates** for major cities and highways
- **PIN types**: radar, accident
- **Detailed information** for notifications

## Features
- ✅ **CORS enabled** for cross-origin requests
- ✅ **Request logging** to activity.log
- ✅ **Error handling** with proper HTTP status codes
- ✅ **Input validation** for all endpoints
- ✅ **Mock analytics** in responses
- ✅ **Distance calculations** using Haversine formula
- ✅ **Route geometry analysis** for pin detection

## Testing
```bash
# Get all pins
curl -X GET "http://your-domain.com/api/pins/all"

# Get changes since timestamp
curl -X GET "http://your-domain.com/api/pins/changes?since=2025-01-08T10:00:00Z"

# Get pin details
curl -X GET "http://your-domain.com/api/pins/pin-001/details"

# Scan route for pins
curl -X POST "http://your-domain.com/api/route/scan" \
  -H "Content-Type: application/json" \
  -d '{"geometry":{"coordinates":[[8.0059,58.1467],[7.4609,58.0294]]},"tolerance":500}'

# Report pin alert
curl -X POST "http://your-domain.com/api/reports/pin-alert" \
  -H "Content-Type: application/json" \
  -d '{"pin_id":"pin-001","user_id":"user-123","location":{"lat":58.1467,"lng":8.0059},"timestamp":"2025-01-08T10:00:00Z","context":"proximity"}'
```

## Logs
All API activity is logged to `/api/logs/activity.log` with:
- Timestamp
- Request type
- Request data
- IP address
- User agent

## Migration to Real Backend
This mock backend provides the exact interface your frontend expects. To migrate:
1. Replace mock data with database queries
2. Add authentication/authorization
3. Implement real distance calculations
4. Add rate limiting
5. Set up proper error monitoring

## Security Notes
- ⚠️ **No authentication** in mock mode
- ⚠️ **Open CORS** for development
- ⚠️ **No rate limiting**
- ⚠️ **All logs stored in files**

For production, implement proper security measures.
