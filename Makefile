.PHONY: backend-install backend-test frontend-install frontend-start lint

backend-install:
	pip install -r requirements.txt

backend-test:
	pytest backend/tests

frontend-install:
	cd frontend && npm install

frontend-start:
	cd frontend && npm start

lint:
	flake8 backend || true
