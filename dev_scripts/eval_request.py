import requests, json

url = 'http://127.0.0.1:8000/api/evaluate-interview'
payload = {
    "session_id": "test_session_123",
    "candidate_name": "Alice Example",
    "role_name": "Software Engineer",
    "resume_text": "Alice has 5 years experience building web applications with Python and JS.",
    "job_description": "Seeking a Software Engineer experienced with web backends and APIs.",
    "questions": [
        {"question": "Tell me about your experience building web apps.", "question_number": 1},
        {"question": "Describe a challenging bug you fixed.", "question_number": 2}
    ],
    "responses": [
        {"response": "I built several REST APIs using FastAPI and Flask.", "question_number": 1},
        {"response": "I debugged a race condition in a background worker by adding locks and tests.", "question_number": 2}
    ]
}

try:
    r = requests.post(url, json=payload, timeout=60)
    print('STATUS', r.status_code)
    try:
        print(json.dumps(r.json(), indent=2))
    except Exception as e:
        print('Failed to decode JSON:', e)
        print(r.text)
except Exception as e:
    print('Request failed:', e)
