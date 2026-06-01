/**
 * JD-Match Score: skill-group matching with synonym awareness.
 * Compares a resume against a job description using:
 * 1. Direct skill matches (exact or variant match)
 * 2. Category matches (related skills in the same domain)
 * 3. Synonym expansion (frontend = front-end = front end)
 *
 * This approach produces meaningful scores because it understands
 * that React experience is relevant to a "frontend" requirement,
 * and AWS experience is relevant to "cloud infrastructure."
 */

export type JDMatchResult = {
  score: number;                // 0-100
  matched: string[];            // keywords found in both
  missing: string[];            // keywords in JD but not resume
  resumeOnly: string[];         // keywords in resume but not JD (extras)
  totalJdKeywords: number;
};

/* ─────────────────────────────────────────
   Skill categories — related skills grouped together.
   If a JD requires a skill in a category and the resume
   has ANY skill in that category, it's a partial match.
───────────────────────────────────────── */
type SkillCategory = {
  name: string;
  skills: string[];
};

const SKILL_CATEGORIES: SkillCategory[] = [
  // Languages
  { name: "Python", skills: ["python", "django", "flask", "fastapi", "pandas", "numpy", "scipy", "jupyter"] },
  { name: "JavaScript/TypeScript", skills: ["javascript", "typescript", "js", "ts", "es6", "es2015", "ecmascript"] },
  { name: "Java", skills: ["java", "spring", "springboot", "spring boot", "maven", "gradle", "hibernate", "jvm"] },
  { name: "C/C++", skills: ["c", "c++", "cpp", "c#", "csharp", ".net", "dotnet", "asp.net"] },
  { name: "Go", skills: ["go", "golang"] },
  { name: "Ruby", skills: ["ruby", "rails", "ruby on rails", "sinatra"] },
  { name: "Rust", skills: ["rust", "cargo"] },
  { name: "Swift/iOS", skills: ["swift", "swiftui", "uikit", "ios", "xcode", "cocoapods", "objective-c"] },
  { name: "Kotlin/Android", skills: ["kotlin", "android", "jetpack", "jetpack compose"] },
  { name: "PHP", skills: ["php", "laravel", "symfony", "wordpress", "composer"] },
  { name: "SQL", skills: ["sql", "plsql", "tsql", "mysql", "postgresql", "postgres", "mssql", "oracle", "sqlite", "mariadb"] },
  { name: "R/Statistics", skills: ["r", "rstudio", "statistics", "statistical", "stata", "spss", "sas"] },
  { name: "Scala", skills: ["scala", "akka", "play framework"] },
  { name: "Shell/Scripting", skills: ["bash", "shell", "zsh", "powershell", "scripting"] },

  // Frontend
  { name: "React", skills: ["react", "reactjs", "react.js", "nextjs", "next.js", "gatsby", "remix", "redux", "mobx", "zustand", "recoil"] },
  { name: "Angular", skills: ["angular", "angularjs", "angular.js", "rxjs", "ngrx"] },
  { name: "Vue", skills: ["vue", "vuejs", "vue.js", "nuxt", "nuxtjs", "vuex", "pinia"] },
  { name: "Svelte", skills: ["svelte", "sveltekit"] },
  { name: "Frontend Core", skills: ["html", "html5", "css", "css3", "sass", "scss", "less", "tailwind", "tailwindcss", "bootstrap", "styled-components", "emotion", "material-ui", "mui", "chakra", "frontend", "front-end", "front end", "ui", "ux", "responsive", "responsive design", "web development"] },
  { name: "Build Tools", skills: ["webpack", "vite", "rollup", "parcel", "esbuild", "babel", "turbopack"] },

  // Backend
  { name: "Node.js", skills: ["node", "nodejs", "node.js", "express", "expressjs", "fastify", "nestjs", "koa", "hapi"] },
  { name: "Backend/API", skills: ["backend", "back-end", "back end", "api", "rest", "restful", "graphql", "grpc", "soap", "websocket", "websockets", "microservices", "serverless", "lambda"] },

  // Databases
  { name: "Relational DB", skills: ["sql", "postgresql", "postgres", "mysql", "mariadb", "sqlite", "oracle", "mssql", "rds", "database", "relational"] },
  { name: "NoSQL", skills: ["nosql", "mongodb", "dynamodb", "cassandra", "couchdb", "firestore", "firebase", "couchbase", "document database"] },
  { name: "Cache/Search", skills: ["redis", "memcached", "elasticsearch", "solr", "opensearch", "caching"] },
  { name: "ORM/Query", skills: ["prisma", "sequelize", "typeorm", "mongoose", "knex", "drizzle", "sqlalchemy", "activerecord", "hibernate"] },
  { name: "Graph DB", skills: ["neo4j", "neptune", "graph database", "arangodb"] },

  // Cloud & Infrastructure
  { name: "AWS", skills: ["aws", "amazon web services", "ec2", "s3", "rds", "ecs", "eks", "fargate", "lambda", "cloudfront", "route53", "cloudformation", "cdk", "sqs", "sns", "dynamodb", "cloudwatch", "iam"] },
  { name: "Azure", skills: ["azure", "microsoft azure", "azure devops", "azure functions", "azure ad"] },
  { name: "GCP", skills: ["gcp", "google cloud", "bigquery", "cloud run", "cloud functions", "pubsub", "gke"] },
  { name: "Cloud General", skills: ["cloud", "cloud computing", "cloud infrastructure", "cloud native", "heroku", "vercel", "netlify", "digitalocean", "linode", "cloudflare"] },

  // DevOps & CI/CD
  { name: "Containers", skills: ["docker", "kubernetes", "k8s", "container", "containers", "containerization", "helm", "istio", "podman", "ecs", "eks", "gke", "aks"] },
  { name: "IaC", skills: ["terraform", "ansible", "puppet", "chef", "cloudformation", "cdk", "pulumi", "infrastructure as code", "iac"] },
  { name: "CI/CD", skills: ["ci/cd", "cicd", "jenkins", "circleci", "travis", "github actions", "gitlab ci", "bitbucket pipelines", "continuous integration", "continuous deployment", "continuous delivery", "pipeline", "pipelines"] },
  { name: "DevOps", skills: ["devops", "sre", "site reliability", "infrastructure", "deployment", "monitoring", "observability", "linux", "unix", "ubuntu", "centos", "debian"] },
  { name: "Observability", skills: ["datadog", "new relic", "splunk", "prometheus", "grafana", "elk", "kibana", "logstash", "observability", "monitoring", "alerting", "apm"] },

  // Data & ML
  { name: "Data Engineering", skills: ["etl", "data pipeline", "data warehouse", "data lake", "spark", "hadoop", "hive", "airflow", "kafka", "flink", "dbt", "snowflake", "bigquery", "redshift", "databricks", "data engineering", "data modeling"] },
  { name: "Machine Learning", skills: ["machine learning", "ml", "deep learning", "neural network", "neural networks", "tensorflow", "pytorch", "keras", "scikit-learn", "sklearn", "xgboost", "model training", "model deployment", "mlops", "feature engineering"] },
  { name: "AI/NLP", skills: ["ai", "artificial intelligence", "nlp", "natural language processing", "llm", "large language model", "gpt", "bert", "transformer", "computer vision", "cv", "generative ai", "gen ai"] },
  { name: "Data Analysis", skills: ["data analysis", "analytics", "data analytics", "tableau", "power bi", "looker", "metabase", "visualization", "data visualization", "reporting", "dashboards", "excel", "spreadsheet"] },
  { name: "Data Science", skills: ["data science", "pandas", "numpy", "scipy", "jupyter", "matplotlib", "seaborn", "statistical analysis", "hypothesis testing", "a/b testing", "ab testing", "experimentation"] },

  // Mobile
  { name: "Mobile Dev", skills: ["mobile", "mobile development", "react native", "flutter", "xamarin", "ionic", "capacitor", "mobile app", "cross-platform"] },

  // Testing
  { name: "Testing", skills: ["testing", "test", "tests", "jest", "mocha", "chai", "cypress", "playwright", "selenium", "puppeteer", "pytest", "junit", "testng", "rspec", "minitest", "tdd", "bdd", "unit testing", "integration testing", "e2e", "end-to-end", "qa", "quality assurance", "test automation", "automated testing"] },

  // Security
  { name: "Security", skills: ["security", "cybersecurity", "infosec", "information security", "oauth", "oauth2", "jwt", "saml", "sso", "ldap", "active directory", "encryption", "ssl", "tls", "https", "penetration testing", "owasp", "soc", "siem", "vulnerability", "authentication", "authorization", "identity"] },

  // Version Control & Collaboration
  { name: "Git/VCS", skills: ["git", "github", "gitlab", "bitbucket", "svn", "version control", "source control", "pull request", "code review"] },

  // Project Management
  { name: "Agile/Scrum", skills: ["agile", "scrum", "kanban", "waterfall", "lean", "sprint", "backlog", "user story", "user stories", "retrospective", "standup", "stand-up"] },
  { name: "PM Tools", skills: ["jira", "confluence", "asana", "trello", "monday", "linear", "notion", "clickup", "shortcut"] },
  { name: "Product Management", skills: ["product management", "product manager", "product owner", "roadmap", "stakeholder", "stakeholders", "requirements gathering", "prd", "user research", "market research"] },

  // Design
  { name: "Design Tools", skills: ["figma", "sketch", "adobe xd", "invision", "zeplin", "photoshop", "illustrator", "canva"] },
  { name: "UX Design", skills: ["ux", "ux design", "user experience", "usability", "wireframe", "wireframing", "prototype", "prototyping", "user research", "design thinking", "information architecture"] },

  // Messaging & Streaming
  { name: "Messaging", skills: ["kafka", "rabbitmq", "sqs", "sns", "pubsub", "nats", "activemq", "message queue", "event-driven", "event driven", "streaming"] },

  // Architecture
  { name: "Architecture", skills: ["architecture", "system design", "design patterns", "solid", "microservices", "monolith", "distributed systems", "scalability", "high availability", "fault tolerance", "load balancing", "caching"] },

  // Leadership & Soft Skills
  { name: "Leadership", skills: ["leadership", "lead", "manager", "management", "mentoring", "coaching", "team lead", "tech lead", "engineering manager", "director", "vp", "head of", "people management"] },
  { name: "Communication", skills: ["communication", "presentation", "public speaking", "technical writing", "documentation", "cross-functional", "collaboration", "stakeholder management"] },
];

// Build lookup maps for fast access
const skillToCategories = new Map<string, string[]>();
for (const cat of SKILL_CATEGORIES) {
  for (const skill of cat.skills) {
    const existing = skillToCategories.get(skill) || [];
    existing.push(cat.name);
    skillToCategories.set(skill, existing);
  }
}

const allKnownSkills = new Set<string>();
for (const cat of SKILL_CATEGORIES) {
  for (const skill of cat.skills) {
    allKnownSkills.add(skill);
  }
}

/* ─────────────────────────────────────────
   Synonyms — map variants to canonical form
───────────────────────────────────────── */
const SYNONYMS: Record<string, string> = {
  "reactjs": "react", "react.js": "react",
  "vuejs": "vue", "vue.js": "vue",
  "angularjs": "angular", "angular.js": "angular",
  "nodejs": "node", "node.js": "node",
  "nextjs": "next.js",
  "nuxtjs": "nuxt",
  "expressjs": "express",
  "tailwindcss": "tailwind",
  "k8s": "kubernetes",
  "golang": "go",
  "js": "javascript", "ts": "typescript",
  "postgres": "postgresql",
  "mongo": "mongodb",
  "csharp": "c#",
  "cpp": "c++",
  "frontend": "front-end", "front end": "front-end",
  "backend": "back-end", "back end": "back-end",
  "cicd": "ci/cd",
  "devops": "devops",
  "ml": "machine learning",
  "dl": "deep learning",
  "fullstack": "full-stack", "full stack": "full-stack",
};

/* ─────────────────────────────────────────
   Stop words
───────────────────────────────────────── */
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "as", "is", "was", "are", "were", "be",
  "been", "being", "have", "has", "had", "do", "does", "did", "will",
  "would", "could", "should", "may", "might", "can", "shall", "must",
  "that", "this", "these", "those", "it", "its", "i", "you", "we",
  "they", "he", "she", "our", "your", "their", "my", "me", "us",
  "him", "her", "them", "who", "which", "what", "where", "when",
  "how", "all", "each", "every", "both", "few", "more", "most",
  "other", "some", "such", "no", "not", "only", "own", "same",
  "than", "too", "very", "just", "about", "above", "after", "again",
  "also", "any", "because", "before", "between", "during",
  "into", "out", "over", "through", "under", "until", "up", "while",
  "able", "across", "along", "among", "around", "work", "working",
  "experience", "role", "team", "company", "position", "candidate",
  "including", "within", "well", "strong", "etc", "using", "new",
  "required", "preferred", "ability", "responsibilities", "requirements",
  "job", "description", "apply", "equal", "opportunity", "employer",
  "looking", "join", "exciting", "passionate", "dynamic", "innovative",
  "world-class", "best-in-class", "fast-paced", "collaborative",
  "driven", "motivated", "dedicated", "committed", "proven",
  "excellent", "exceptional", "outstanding", "great", "good",
  "environment", "culture", "mission", "vision", "values",
  "competitive", "comprehensive", "benefits", "salary", "compensation",
  "bonus", "equity", "stock", "options", "401k", "health", "dental",
  "insurance", "vacation", "pto", "remote", "hybrid", "onsite", "office",
  "years", "year", "minimum", "maximum", "plus", "least",
  "related", "relevant", "similar", "equivalent", "degree",
  "bachelor", "bachelors", "master", "masters", "phd", "mba",
  "education", "university", "college", "school", "field",
  "science", "engineering", "computer", "technology", "information",
  "based", "build", "building", "create", "creating", "develop",
  "developing", "design", "designing", "implement", "implementing",
  "manage", "managing", "lead", "leading", "support", "supporting",
  "ensure", "ensuring", "maintain", "maintaining", "improve", "improving",
  "provide", "providing", "deliver", "delivering", "drive", "driving",
  "collaborate", "collaborating", "contribute", "contributing",
  "understand", "understanding", "knowledge", "familiar", "familiarity",
  "proficient", "proficiency", "expertise", "expert", "skilled",
  "hands-on", "track", "record", "background", "success", "successful",
  "responsible", "responsibility", "oversight", "ownership",
  "need", "like", "want", "make", "take", "help", "get",
  "come", "give", "use", "find", "tell", "ask", "try", "keep",
  "let", "begin", "show", "hear", "play", "run", "move", "live",
  "believe", "bring", "happen", "write", "sit", "stand", "lose",
  "pay", "meet", "include", "continue", "set", "learn", "change",
  "follow", "stop", "start", "allow", "add", "grow", "open", "walk",
  "offer", "remember", "consider", "appear", "serve", "expect",
  "report", "reports", "reporting", "directly", "closely",
  "business", "customer", "customers", "client", "clients",
  "solution", "solutions", "service", "services", "product", "products",
  "process", "processes", "system", "systems", "platform", "platforms",
  "level", "high", "low", "top", "part", "full", "time", "day",
  "one", "two", "three", "four", "five",
]);

/* ─────────────────────────────────────────
   Skill extraction
───────────────────────────────────────── */
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/['']/g, "'").replace(/[""]/g, '"');
}

function canonicalize(term: string): string {
  return SYNONYMS[term] || term;
}

function extractSkillsFromText(text: string): { skills: Set<string>; categories: Set<string> } {
  const normalized = normalizeText(text);
  const skills = new Set<string>();
  const categories = new Set<string>();

  // 1. Check for multi-word known skills
  for (const skill of allKnownSkills) {
    if (skill.length > 3 && (skill.includes(" ") || skill.includes("-") || skill.includes(".") || skill.includes("/"))) {
      if (normalized.includes(skill)) {
        const canonical = canonicalize(skill);
        skills.add(canonical);
        const cats = skillToCategories.get(skill);
        if (cats) cats.forEach((c) => categories.add(c));
      }
    }
  }

  // 2. Tokenize and check single-word skills
  const tokens = normalized
    .replace(/[^a-z0-9\s\-\+#\.\/]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);

  for (const token of tokens) {
    if (allKnownSkills.has(token)) {
      const canonical = canonicalize(token);
      skills.add(canonical);
      const cats = skillToCategories.get(token);
      if (cats) cats.forEach((c) => categories.add(c));
    }
  }

  // 3. Check bigrams
  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = `${tokens[i]} ${tokens[i + 1]}`;
    if (allKnownSkills.has(bigram)) {
      const canonical = canonicalize(bigram);
      skills.add(canonical);
      const cats = skillToCategories.get(bigram);
      if (cats) cats.forEach((c) => categories.add(c));
    }
  }

  return { skills, categories };
}

/* ─────────────────────────────────────────
   Scoring — 3-tier matching
───────────────────────────────────────── */
export function computeJDMatch(resumeText: string, jdText: string): JDMatchResult {
  const resume = extractSkillsFromText(resumeText);
  const jd = extractSkillsFromText(jdText);

  if (jd.skills.size === 0) {
    return { score: 75, matched: [], missing: [], resumeOnly: [], totalJdKeywords: 0 };
  }

  const matched: string[] = [];
  const categoryMatched: string[] = []; // partial matches via related skills
  const missing: string[] = [];

  for (const jdSkill of jd.skills) {
    // Tier 1: Direct match (exact or synonym)
    if (resume.skills.has(jdSkill)) {
      matched.push(jdSkill);
      continue;
    }

    // Check canonical forms
    const jdCanonical = canonicalize(jdSkill);
    let directMatch = false;
    for (const rSkill of resume.skills) {
      if (canonicalize(rSkill) === jdCanonical) {
        matched.push(jdSkill);
        directMatch = true;
        break;
      }
    }
    if (directMatch) continue;

    // Tier 2: Category match — resume has a related skill
    const jdCats = skillToCategories.get(jdSkill);
    if (jdCats && jdCats.some((cat) => resume.categories.has(cat))) {
      categoryMatched.push(jdSkill);
      continue;
    }

    // Tier 3: No match
    missing.push(jdSkill);
  }

  // Resume-only skills (for display)
  const resumeOnly: string[] = [];
  for (const rSkill of resume.skills) {
    if (!jd.skills.has(rSkill) && !jd.skills.has(canonicalize(rSkill))) {
      // Check if any JD skill shares a canonical form
      let found = false;
      for (const jSkill of jd.skills) {
        if (canonicalize(jSkill) === canonicalize(rSkill)) { found = true; break; }
      }
      if (!found) resumeOnly.push(rSkill);
    }
  }

  // Scoring weights:
  // Direct match: 1.0 points
  // Category match: 0.6 points (related skill counts for something)
  // Missing: 0 points
  const totalSkills = jd.skills.size;
  const directScore = matched.length * 1.0;
  const categoryScore = categoryMatched.length * 0.6;
  const rawScore = ((directScore + categoryScore) / totalSkills) * 100;

  // Apply a gentle curve to spread scores into useful range
  // raw 30% → ~52%, raw 50% → ~70%, raw 70% → ~85%, raw 90% → ~96%
  const curved = 100 * (1 - Math.pow(1 - rawScore / 100, 1.5));

  // Floor at 15 (if we found any matches at all) so it never looks absurdly low
  const finalScore = matched.length > 0 || categoryMatched.length > 0
    ? Math.max(15, Math.round(curved))
    : 0;

  // Combine matched + category matched for display
  const allMatched = [...matched, ...categoryMatched.map((s) => `${s} (related)`)];

  return {
    score: Math.min(100, finalScore),
    matched: allMatched.slice(0, 30),
    missing: missing.slice(0, 20),
    resumeOnly: resumeOnly.slice(0, 10),
    totalJdKeywords: totalSkills,
  };
}
