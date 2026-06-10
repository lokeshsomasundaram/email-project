pipeline {
    agent none

    environment {
        GIT_REPO = 'https://github.com/lokeshsomasundaram/email-project.git'
        BRANCH   = 'main'

        APP_DIR = '/home/ubuntu/stackly-email'

        DB_NAME     = 'stackly_db'
        DB_USER     = 'stackly_test'
        DB_PASSWORD = 'Test@1234'
        DB_HOST     = '127.0.0.1'
        DB_PORT     = '3306'
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

                        echo "Building frontend..."
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

                    echo "Creating deployment directory..."
                    mkdir -p ${APP_DIR}

                    echo "Syncing workspace to deployment directory..."

                    rsync -av \
                        --delete \
                        --exclude='.git' \
                        --exclude='fastapi_app/venv/' \
                        ${WORKSPACE}/ \
                        ${APP_DIR}/

                    cd ${APP_DIR}

                    if [ ! -d fastapi_app/venv ]; then
                        echo "Creating Python virtual environment..."
                        python3 -m venv fastapi_app/venv
                    fi

                    echo "Activating virtual environment..."
                    . fastapi_app/venv/bin/activate

                    echo "Upgrading pip..."
                    python -m pip install --upgrade pip

                    echo "Installing Python dependencies..."
                    python -m pip install -r requirements.txt

                    echo "Running database migrations..."
                    python manage.py migrate --noinput

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

                    echo "Service status:"
                    sudo systemctl status fastapi --no-pager -l || true
                    sudo systemctl status nginx --no-pager -l || true

                    echo "Deployment completed successfully."
                '''
            }
        }
    }

    post {
        success {
            echo '✅ SUCCESS: EmailApp deployment completed.'
        }

        failure {
            echo '❌ FAILED: EmailApp deployment failed.'
        }

        always {
            cleanWs()
        }
    }
}
