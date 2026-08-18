# AI Collaboration Log

## Deployed Links

* Deployed FastAPI: https://cre-comps-explorer.vercel.app/
* Deployed .NET API: https://cre-comps-explorer-bckv-rouge.vercel.app/

## 1) Tools Used

I used **GitHub Copilot inside VS Code** as my main AI collaborator throughout this project. I also used browser and runtime validation tools in the workspace to verify the application behavior live.

GitHub Copilot was mainly used to:

* Debug application startup issues and environment configuration.
* Review FastAPI and React code paths to understand how the UI fetches and renders comparable company data.
* Trace the communication between the React frontend, FastAPI backend, .NET services, and PostgreSQL database.
* Validate the relationship between frontend filters, API query parameters, and backend SQL filters.
* Investigate whether an apparent "0 matching comps" issue was caused by configuration, data, filtering, or incorrect route assumptions.
* Understand deployment-related errors and identify possible configuration issues.
* Help structure and refine this AI collaboration log.

The main AI assistance was through GitHub Copilot in the editor. In engineering terms, AI was used to accelerate reasoning, identify possible causes, spot blind spots, and explain contract mismatches between different layers of the application. However, I validated the suggestions against the actual code, database, configuration, and live application behavior.

---

## 2) Main Difficulties Faced During the Project

### 2.1 Connecting Multiple Technologies

One of the main challenges was integrating multiple technologies in a single application. The project involved a **React frontend, FastAPI backend, .NET services, and PostgreSQL database**.

Each component had its own routes, configuration, data formats, and communication requirements. Making sure that the frontend called the correct backend API and that the backend returned the expected response format required careful debugging and validation.

### 2.2 Localhost vs Production Deployment

The application worked correctly in the local development environment using `localhost` URLs. However, after deployment, the frontend and backend were hosted using different online URLs.

Some URLs were initially configured for local development, so they stopped working after deployment. I had to identify these hardcoded or environment-specific values and configure the application to use the correct production URLs.

This helped me understand the difference between development configuration and production configuration.

### 2.3 CORS Issues

After deployment, the React frontend and backend were hosted on different domains. This introduced **Cross-Origin Resource Sharing (CORS)** restrictions.

Although both applications were running independently, the browser prevented the frontend from communicating with the backend until the correct CORS configuration was added.

Debugging this required understanding that the issue was not necessarily a frontend or backend failure, but a restriction between the two different origins.

### 2.4 FastAPI Deployment and Database Configuration

The FastAPI application worked correctly locally but initially encountered problems after deployment on Render.

One of the issues was an **empty or invalid PostgreSQL port being passed to SQLAlchemy**. I had to understand how environment variables were being read and how the database configuration was passed to the application.

I had to correctly configure values such as:

* Database host
* Database port
* Database username
* Database password
* Database name
* Database connection string

This was an important part of understanding how applications connect to databases in production environments.

### 2.5 Development vs Production Environment

Another major difficulty was understanding that an application can behave differently in local and production environments even when the application code itself has not changed.

Local database settings, API URLs, environment variables, CORS configuration, and deployment-specific settings had to be changed appropriately for production.

This taught me to consider configuration and infrastructure as part of the application rather than assuming that code working locally will automatically work after deployment.

### 2.6 .NET Deployment Issue

The .NET application encountered an issue after being deployed to the Linux/Render environment because of the **inotify file-watcher limit**.

Initially, this appeared to be an application failure. After investigation, I understood that the problem was related to the hosting environment and its operating-system resource limits rather than the application's business logic.

This helped me understand the importance of distinguishing between application-level errors and infrastructure-level errors.

### 2.7 PostgreSQL Setup

I initially had to determine whether PostgreSQL needed to be installed and configured locally for the application.

During the process, I learned that a managed PostgreSQL service such as **Neon PostgreSQL** could be used instead. The backend could connect to the remotely hosted database using the appropriate connection configuration.

This simplified database management and also gave me experience working with cloud-hosted databases.

### 2.8 Database Security

Another challenge was ensuring that database credentials were not exposed in GitHub.

Database passwords and connection strings should not be hardcoded into source code or committed to a public repository. I therefore had to move sensitive configuration into environment variables.

This gave me practical experience with secure configuration management and the importance of protecting database credentials.

---

## 3) Prompts and Outcomes

### Prompt 1 – Tracing the Data Flow

**What I asked GitHub Copilot for:**

I asked GitHub Copilot to explain the data flow from the Comps list page to the API endpoint. I also asked how to verify whether the page was receiving actual data or an empty result set.

**What GitHub Copilot provided:**

It helped me trace the route. The frontend calls `fetchComps()` in `frontend/src/api.js`, which builds the query string and fetches `/api/comps`. The backend route in `backend/app/routers/comps.py` then applies filters and pagination before returning `items`, `page`, and `total_pages`.

**What I did with the response:**

I used this as a diagnostic path and then verified the endpoint directly over HTTP. I checked that the response contained actual entries and a non-zero `total`.

I did not copy the AI response blindly. I cross-checked the code against the live runtime behavior.

---

### Prompt 2 – Investigating Zero Matching Comps

**What I asked GitHub Copilot for:**

I asked GitHub Copilot to explain why the list page could show zero matches even though the database contained comps.

**What GitHub Copilot suggested:**

It identified several possible causes, including:

* Incorrect backend API base URL
* Stale environment variables
* Missing database seed data
* Incorrect filter values
* Backend route assumptions

It also pointed me toward `VITE_API_BASE_URL`, backend route logic, and the PostgreSQL data.

**What I did with the response:**

I used these suggestions as a troubleshooting checklist and validated each possibility individually.

The actual issue was not a fundamental frontend rendering problem or a broken `list_comps` implementation. The backend was capable of returning valid rows. The deeper problem involved runtime/environment configuration and verifying the deployed data and configuration.

---

### Prompt 3 – Understanding Filtering and Sorting

**What I asked GitHub Copilot for:**

I asked GitHub Copilot to show and explain the backend filtering and sorting logic used for `list_comps`, including how the query is assembled before it reaches SQL.

**What GitHub Copilot identified:**

It identified relevant functions in:

* `backend/app/comp_filters.py`
* `backend/app/routers/comps.py`

These included:

* `build_comp_filters()`
* `sort_expression()`
* `select(Comp)...where(*filters)...order_by(...)`

Copilot also explained how `page`, `page_size`, and `sort_by` map to the API contract.

**What I did with the response:**

I reviewed the actual route and compared the live query output against the dataset. This gave me confidence that the filtering and sorting behavior was correct and that the earlier issue was primarily environmental/configuration-related rather than a problem with the SQL filtering logic.

---

### Prompt 4 – Creating the AI Log

**What I asked GitHub Copilot for:**

I asked GitHub Copilot to help structure the AI log with sections covering tools used, prompts, rejection/correction, acceleration wins, and reflection.

**What GitHub Copilot provided:**

It provided a structured outline and wording suggestions for a professional engineering log.

**What I did with the response:**

I adapted the structure to match the actual project requirements and ensured that the content reflected real project work, debugging, runtime validation, and my own decisions.

The AI output was used as a scaffold rather than as a replacement for my own reasoning.

---

## 4) Rejection or Correction

A concrete correction happened while validating the application after setup.

When the Comps list page appeared to show an empty result set, the initial AI-assisted diagnostic path suggested that the problem could be related to the frontend or backend route/filter logic. I initially considered that the list page might be broken or that the backend query might be filtering out all rows.

However, this was only a hypothesis.

I verified the API endpoint directly and found that the backend was returning valid rows and a non-zero total. This showed that the `list_comps` implementation itself was not the main problem.

The deeper issue was related to **environment/configuration drift and runtime verification**, rather than an application logic defect.

This experience taught me that AI suggestions can be directionally useful but may not always identify the exact root cause. I corrected the investigation by checking the actual API response, route behavior, database state, and configuration.

The final decision was based on evidence rather than the initial AI suggestion.

---

## 5) Acceleration Win

One of the clearest acceleration wins was during the Comps list-page verification.

I asked GitHub Copilot to explain the frontend-to-backend flow and identify the likely places to inspect when the application appeared empty.

Copilot quickly mapped the important path:

`frontend/src/api.js`
→ `fetchComps()`
→ `/api/comps`
→ `backend/app/routers/comps.py`
→ `build_comp_filters()`

Once this flow was clear, I could focus on the API contract, filters, environment configuration, and critical response fields instead of reading the entire codebase blindly.

I then validated the endpoint directly and confirmed that the response contained real items and a valid `total` value.

This significantly reduced the debugging time and helped me understand that the fastest way to determine the actual problem was to inspect the raw API response rather than relying only on what was displayed in the UI.

---

## 6) Reflection

Using GitHub Copilot was valuable for speeding up investigation, code reading, and debugging, especially because this project involved multiple layers including **React, FastAPI, .NET, PostgreSQL, and cloud deployment**.

Copilot helped me understand the data flow between components and reason about the exact contract between the frontend and backend. It also helped generate possible causes for issues that were initially difficult to understand.

At the same time, my own judgment was essential because AI suggestions can sometimes be directionally correct but incomplete or inaccurate for a specific project environment.

The deployment issues also taught me that not every problem is caused by application code. Configuration, environment variables, CORS, database connectivity, operating-system limitations, and deployment infrastructure can all affect application behavior.

Going forward, I would continue using GitHub Copilot early for code reading, debugging, and hypothesis generation. However, I would always perform direct runtime checks before accepting a proposed explanation or implementing a fix.

I would also pay more attention to environment and configuration differences between development and production because they can create problems even when the application logic is correct.

In short, **GitHub Copilot accelerated the work, but verification, testing, and engineering judgment remained the final authority.**

---

## Final Note

This log reflects the collaboration pattern I used throughout the project.

GitHub Copilot helped me identify likely investigation paths, understand the code, trace frontend-to-backend communication, debug configuration issues, and organize my reasoning.

However, I did not rely on AI output blindly. I validated important suggestions using the actual source code, API responses, database state, deployment configuration, and live runtime behavior.

The project ultimately helped me understand not only how to build the application, but also how to systematically troubleshoot issues across **application code, APIs, databases, environments, deployment platforms, and infrastructure**.

The main lesson I learned was:

**AI can accelerate engineering work, but evidence-based validation and human judgment are necessary to reach the correct solution.**