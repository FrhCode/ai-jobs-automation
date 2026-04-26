import { useMemo } from 'react';
import { Tag } from 'lucide-react';

interface KeywordCloudProps {
  readonly resumeText: string;
}

const COMMON_TECH_TERMS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP',
  'Swift', 'Kotlin', 'Scala', 'R', 'MATLAB', 'SQL', 'NoSQL', 'MongoDB', 'PostgreSQL', 'MySQL',
  'Redis', 'Elasticsearch', 'GraphQL', 'REST', 'REST API', 'gRPC', 'WebSocket', 'SOAP',
  'React', 'Vue', 'Angular', 'Svelte', 'Next.js', 'Nuxt', 'Express', 'NestJS', 'Django',
  'Flask', 'Spring', 'Laravel', 'Rails', 'ASP.NET', 'Node.js', 'Bun', 'Deno',
  'AWS', 'Azure', 'GCP', 'Google Cloud', 'Firebase', 'Vercel', 'Netlify', 'Heroku',
  'Docker', 'Kubernetes', 'K8s', 'Terraform', 'Ansible', 'Jenkins', 'GitHub Actions',
  'GitLab CI', 'CircleCI', 'Travis CI', 'ArgoCD', 'Prometheus', 'Grafana', 'ELK',
  'Linux', 'Ubuntu', 'CentOS', 'Debian', 'Windows Server', 'macOS', 'iOS', 'Android',
  'Git', 'GitHub', 'GitLab', 'Bitbucket', 'SVN', 'Jira', 'Confluence', 'Trello',
  'Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator', 'Blender', 'Unity',
  'Unreal Engine', 'TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn', 'Pandas', 'NumPy',
  'OpenCV', 'NLTK', 'SpaCy', 'Hugging Face', 'LLM', 'OpenAI', 'LangChain', 'RAG',
  'Machine Learning', 'Deep Learning', 'Data Science', 'Data Engineering', 'Big Data',
  'Hadoop', 'Spark', 'Kafka', 'Airflow', 'dbt', 'Snowflake', 'Databricks',
  'Tableau', 'Power BI', 'Looker', 'Excel', 'SPSS', 'SAS',
  'CI/CD', 'DevOps', 'MLOps', 'SRE', 'Agile', 'Scrum', 'Kanban', 'TDD', 'BDD',
  'Microservices', 'Serverless', 'Event-Driven', 'CQRS', 'DDD', 'Clean Architecture',
  'OAuth', 'JWT', 'SSO', 'LDAP', 'Active Directory', 'SAML', 'OIDC',
  'Webpack', 'Vite', 'Rollup', 'Parcel', 'Babel', 'ESLint', 'Prettier', 'Jest',
  'Mocha', 'Cypress', 'Playwright', 'Selenium', 'Puppeteer', 'Vitest',
  'Nginx', 'Apache', 'HAProxy', 'Cloudflare', 'CDN', 'Load Balancer',
  'HTML', 'CSS', 'Sass', 'Less', 'Tailwind CSS', 'Bootstrap', 'Material UI', 'Styled Components',
  'Three.js', 'D3.js', 'Chart.js', 'Highcharts', 'ECharts',
  'PHPMyAdmin', 'pgAdmin', 'DBeaver', 'Navicat', 'DataGrip',
  'IntelliJ', 'VS Code', 'Eclipse', 'Xcode', 'Android Studio',
  'Slack', 'Teams', 'Zoom', 'Notion', 'Obsidian', 'Markdown',
];

const ATS_SUGGESTIONS = [
  'CI/CD', 'Agile', 'Scrum', 'Docker', 'Kubernetes', 'REST API', 'Microservices',
  'Unit Testing', 'Integration Testing', 'Performance Optimization', 'Security Best Practices',
  'Code Review', 'Mentoring', 'Cross-functional Collaboration', 'Stakeholder Management',
  'Data Modeling', 'API Design', 'System Design', 'Cloud Architecture', 'Monitoring',
  'Troubleshooting', 'Problem Solving', 'Technical Documentation', 'Version Control',
];

export function KeywordCloud({ resumeText }: KeywordCloudProps) {
  const { found, missing } = useMemo(() => {
    const text = resumeText.toLowerCase();
    const foundTerms: string[] = [];
    for (const term of COMMON_TECH_TERMS) {
      const search = term.toLowerCase().replace(/\./g, '\\.').replace(/\+/g, '\\+');
      const regex = new RegExp(`\\b${search}\\b`);
      if (regex.test(text)) {
        foundTerms.push(term);
      }
    }
    // Limit found to avoid overcrowding
    const limitedFound = foundTerms.slice(0, 30);
    const missingTerms = ATS_SUGGESTIONS.filter(
      (s) => !text.includes(s.toLowerCase())
    ).slice(0, 15);
    return { found: limitedFound, missing: missingTerms };
  }, [resumeText]);

  if (found.length === 0 && missing.length === 0) return null;

  return (
    <div className="glass-card rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Tag className="w-4 h-4 text-cyan" />
        <h3 className="text-xs font-mono uppercase tracking-widest text-text-muted">
          Keywords
        </h3>
      </div>

      {found.length > 0 && (
        <div>
          <p className="text-xs text-text-secondary mb-2">Detected skills</p>
          <div className="flex flex-wrap gap-1.5">
            {found.map((term) => (
              <span
                key={term}
                className="px-2 py-0.5 rounded text-xs font-mono badge-cyan"
              >
                {term}
              </span>
            ))}
          </div>
        </div>
      )}

      {missing.length > 0 && (
        <div>
          <p className="text-xs text-text-secondary mb-2">Commonly missing ATS keywords</p>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((term) => (
              <span
                key={term}
                className="px-2 py-0.5 rounded text-xs font-mono badge-gray"
              >
                {term}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
