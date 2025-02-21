pipeline {
  agent any
  tools {
    nodejs "stable"
  }
  options {
    timestamps()
    skipDefaultCheckout true
    overrideIndexTriggers false
    buildDiscarder logRotator(artifactDaysToKeepStr: '', artifactNumToKeepStr: '', daysToKeepStr: '7', numToKeepStr: '10')
    disableConcurrentBuilds()
  }
  triggers {
    pollSCM("H/5 * * * *")
  }
  parameters {
    booleanParam(name: 'ANDROID_BUILD', defaultValue: true, description: 'Build an Android version')
    booleanParam(name: 'IOS_BUILD', defaultValue: true, description: 'Build an iOS version')
    booleanParam(name: 'VERBOSE', defaultValue: false, description: 'Complete build log output')
  }
  environment {
    LC_CTYPE = 'en_US.UTF-8'
    DISABLE_XCPRETTY = "${params.VERBOSE}"
  }

  stages {
    stage("Clean the workspace and checkout source") {
      steps {
        deleteDir()
        checkout scm
      }
    }

    stage ("Load credentials") {
      steps {
        // Import the settings files
        withCredentials([
          file(credentialsId: "bfcc847f-213a-4de5-86a5-29b62b34c79d", variable: "deploy_config"),
          file(credentialsId: "94c9f265-a991-432c-9bc4-b74a311f4063", variable: "GoogleService_Info"),
          file(credentialsId: "f1ebd0b2-4e79-4bd4-a290-a3001604c1fc", variable: "google_services"),
          file(credentialsId: "2b938625-9c20-4b64-8c24-ce27543402b6", variable: "edge_release_keystore"),
          file(credentialsId: "05926db4-40f8-42ac-a761-be4e1186ec7a", variable: "env_json"),
        ]) {
          sh "cp ${deploy_config} ./deploy-config.json"
          sh "cp ${GoogleService_Info} ./GoogleService-Info.plist"
          sh "cp ${google_services} ./google-services.json"
          sh "mkdir -p ./keystores temp"
          sh "cp ${edge_release_keystore} ./keystores/edge-release-keystore.jks"
          sh "cp ${env_json} ./env.json"
        }

        // develop credentials
        withCredentials([
          file(credentialsId: "efbd6cab-a1b3-4027-9a15-8c76fe7c1350", variable: "GoogleService_Info"),
          file(credentialsId: "36c06912-38a6-466c-98dd-9ddd98ec7fd4", variable: "google_services"),
          file(credentialsId: "5bbb9f5b-fa33-4f76-9796-0e0638840fe6", variable: "edge_develop_keystore"),
        ]) {
          sh "cp ${GoogleService_Info} ./deployPatches/edge/develop/GoogleService-Info.plist"
          sh "cp ${google_services} ./deployPatches/edge/develop/google-services.json"
          sh "cp ${edge_develop_keystore} ./keystores/edge-develop-keystore.jks"
        }

        // beta credentials
        withCredentials([
          file(credentialsId: "46441f81-81fb-4b74-a9cd-d9ac06dbd164", variable: "GoogleService_Info"),
          file(credentialsId: "d843d89b-855f-4fb9-b45a-092ae0ea3be8", variable: "google_services"),
          file(credentialsId: "f66a749b-e89e-4971-a3b4-a1b6df037a85", variable: "edge_beta_keystore"),
        ]) {
          sh "cp ${GoogleService_Info} ./deployPatches/edge/beta/GoogleService-Info.plist"
          sh "cp ${google_services} ./deployPatches/edge/beta/google-services.json"
          sh "cp ${edge_beta_keystore} ./keystores/edge-beta-keystore.jks"
        }
      }
    }

    stage ("Install dependencies") {
      steps {
        sh "yarn"
      }
    }

    stage ("Patch files") {
      steps {
        sh "node -r sucrase/register ./scripts/patchFiles.ts edge ${BRANCH_NAME}"
      }
    }

    stage ("Get build number and version") {
      steps {
        // Copy release-version.json from the previous build:
        copyArtifacts projectName: "${JOB_NAME}", selector: lastCompleted(), optional: true

        // Pick the new build number and version:
        sh "node -r sucrase/register ./scripts/updateVersion.ts ${BRANCH_NAME}"

        // Update our description:
        script {
          def versionFile = readJSON file: "./release-version.json"
          currentBuild.description = "version: ${versionFile.version} (${versionFile.build})"
        }
      }
    }

    stage ("Pre-build") {
      steps {
        sh "yarn prepare"
      }
    }

    stage ("Test") {
      steps {
        sh "JEST_JENKINS=1 yarn cover --ci"
      }
    }

    stage ("Build") {
      when {
        anyOf {
          branch 'develop'
          branch 'staging'
          branch 'master'
          branch 'beta'
          branch 'test-cheddar'
          branch 'test-feta'
          branch 'test-gouda'
          branch 'test-halloumi'
          branch 'test-paneer'
          branch 'test'
          branch 'yolo'
        }
      }
      stages {
        stage("ios") {
          when { equals expected: true, actual: params.IOS_BUILD }
          steps {
            sh "npm run prepare.ios"
            sh "node -r sucrase/register ./scripts/deploy.ts edge ios ${BRANCH_NAME}"
            sh "node -r sucrase/register ./scripts/uploadSourcemaps.ts ios"
          }
        }
        stage("android") {
          when { equals expected: true, actual: params.ANDROID_BUILD }
          steps {
            sh "node -r sucrase/register ./scripts/deploy.ts edge android ${BRANCH_NAME}"
            sh "node -r sucrase/register ./scripts/uploadSourcemaps.ts android"
          }
        }
      }
    }
  }

  post {
    always {
      echo 'Trying to publish the test report'
      junit healthScaleFactor: 100.0, testResults: '**/coverage/junit.xml', allowEmptyResults: true
      echo 'Trying to publish the code coverage report'
      cobertura(
        coberturaReportFile: '**/coverage/cobertura-coverage.xml',
        failUnhealthy: false,
        failNoReports: false,
        failUnstable: false,
        onlyStable: false,
        zoomCoverageChart: false,
        conditionalCoverageTargets: '70, 0, 0',
        lineCoverageTargets: '70, 0, 0',
        methodCoverageTargets: '70, 0, 0',
        maxNumberOfBuilds: 0,
        sourceEncoding: 'ASCII'
      )
      // Archiving the buildnums for future builds
      archiveArtifacts artifacts: "release-version.json", allowEmptyArchive: true
    }
    success {
      echo "The force is strong with this one"
      deleteDir()
    }
    unstable {
      echo "Do or do not there is no try"
    }
    failure {
      echo "The dark side I sense in you."
    }
  }
}
