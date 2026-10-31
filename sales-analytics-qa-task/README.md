# Sales Analytics – QA interview task

## Instructions for candidates

### 1. Install Node.js

This task requires Node.js version 18 or newer. If Node.js is not already installed, download the
**LTS** version from [nodejs.org](https://nodejs.org/).

### 2. Unzip and open the project folder

Unzip the archive. Open a terminal in the resulting `sales-analytics-qa-task` folder

### 3. Start the application

Run:

```bash
npm start
```

You should see a message containing `http://localhost:3000`.

### 4. Open the application

Open [http://localhost:3000](http://localhost:3000) in a browser. Keep the terminal window running
while using the application.

Read [`requirements.md`](requirements.md) before beginning the test task.

### 5. Inspect API calls via browser DevTools.

## API contract

`GET /api/transactions?dateRange={none|7|30|90}&region={none|Europe|North%20America|Asia}&category={none|Furniture|Appliances|Lighting}&sort={date_asc|date_desc|rev_asc|rev_desc}`

All parameters are optional. The endpoint returns HTTP 200 and this shape:

```json
{
    "data": [
        {
            "id": "#1001",
            "date": "2025-01-05",
            "region": "Europe",
            "category": "Furniture",
            "revenue": 1200
        }
    ],
    "meta": {
        "total": 10,
        "returned": 1,
        "filters": {}
    }
}
```

The response is deliberately delayed by 250 ms so loading behavior can be tested. The mock dataset
is static.
