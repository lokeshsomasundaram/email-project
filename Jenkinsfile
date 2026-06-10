pipeline {
agent none

environment {
    GIT_REPO = 'https://github.com/lokeshsomasundaram/email-project.git'
    BRANCH = 'main'

    DB_NAME = 'stackly_db'
    DB_USER = 'stackly_test'
    DB_PASSWORD = 'Test@1234'
    DB_HOST = '127.0.0.1'
    DB_PORT = '3306'
}

stages {

    stage('Checkout Code') {
        agent { label 'emailnode' }

        steps {
            checkout([
                $class: 'GitSCM',
                branches: [[name: "*/${BRANCH}"]],
                userRemoteConfigs: [[
                    url: "${GIT_REPO}",
                    credentialsId: 'd411fdc7-738f-4516-9a36-bbffd6c7b9e1'
                ]]
            ])
        }
    }

    stage('Build Frontend') {
        agent { label 'emailnode' }

        steps {
            dir('frontend') {
                sh '''
                    set -e

                    echo "Node Version:"
                    node -v
                    npm -v

                    echo "Installing dependencies..."
                    npm ci --no-audit --no-fund || npm install

                    echo "Building Frontend..."
                    npm run build
                '''
            }
        }
    }

    stage('Deploy & Migrate') {
        agent { label 'emailnode' }

        steps {
            sh '''
                set -e

                echo "Syncing workspace to production..."

                rsync -av --delete \
                    --exclude='.git' \
                    --exclude='workspace' \
                    --exclude='agent.jar' \
                    --exclude='remoting' \
                    --exclude='fastapi_app/venv' \
                    /home/ubuntu/stackly-email/workspace/Project-EmailApp/ \
                    /home/ubuntu/stackly-email/

                cd /home/ubuntu/stackly-email

                echo "Activating virtual environment..."
                . fastapi_app/venv/bin/activate

                echo "Installing dependencies..."
                pip install -r requirements.txt

                echo "Running migrations..."
                python manage.py makemigrations
                python manage.py migrate

                echo "Collecting static files..."
                python manage.py collectstatic --noinput
            '''
        }
    }

    stage('Restart Services') {
        agent { label 'emailnode' }

        steps {
            sh '''
                set -e

                echo "Checking nginx configuration..."
                sudo nginx -t

                echo "Restarting FastAPI..."
                sudo systemctl restart fastapi

                echo "Restarting nginx..."
                sudo systemctl restart nginx

                echo "Deployment completed successfully."
            '''
        }
    }
}

post {
    success {
        echo 'SUCCESS: EmailApp deployment completed.'
    }

    failure {
        echo 'FAILED: EmailApp deployment failed.'
    }
}

}
