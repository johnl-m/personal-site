---
title: Automated Vault Credential Retrieval
excerpt: >-
  How to use the Hashicorp Vault API with your Spring Java application
date: '2020-10-09'
layout: post
---

#### Prerequisites: 
* A Vault path, with your secrets your project can use
* A [username and password](https://www.vaultproject.io/docs/auth/userpass) to access your Vault secrets (or an alternative method of authentication)
* A basic [Spring Boot project](https://spring.io/guides/gs/spring-boot/).

There's a lot of good [documentation](https://spring.io/guides/gs/vault-config/) on using the Vault CLI to automatically retrieve secrets and inject them into a Spring application at runtime. This saves time, because you don't have to manually enter them into a Spring properties file, and improves security by making it harder to accidentally commit credentials. But what if you aren't able to install the Vault CLI, or want to minimize the number of external dependencies your application requires users to install?

Another option is to use [Vault's HTTP API](https://www.vaultproject.io/api), which provides similar functionality. In this example, we'll pretend we have an application that calls another API using a username and password we retrieve from Vault.

This guide will first detail how to retrieve secrets from your Vault path, then how to make them available while your application is running. This code was tested using Java 8, but should work for earlier and later versions.

#### Retrieving Secrets at Runtime
Let's start by creating a helper class to retrieve all the secrets in a Vault path as a `java.util.Properties` object we can inject into the application later. You can create this file in any package, for example, `main/java/org.john.example/config/VaultRetrievalUtil.java` .

```java
package org.john.example.config;

import org.springframework.http.*;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.util.*;

public class VaultRetrievalUtil{
    RestTemplate restTemplate = new RestTemplate();
}
```

The first method we'll write will consume our Vault credentials to retrieve a client token, which is required to access the Vault API. We need to escape quotes in the JSON request body.
```java
    private String retrieveVaultClientToken(String vaultUsername, String vaultPassword) {
        String requestBody = "{\\"password\":\\"" + vaultPassword + "\"}";
        URI vaultLoginUri = URI.create("https://vault.mywebsite.com:8200/v1/auth/ldap/login/" + vaultUsername);
        RequestEntity<String> requestEntity = new RequestEntity<>(requestBody, HttpMethod.POST, vaultLoginUri);
        ResponseEntity<JsonNode> responseEntity = restTemplate.exchange(requestEntity, JsonNode.class);
        return Objects.requireNonNull(respone.getBody()).get("auth").get("client_token").asText();
    }
```

Once we have the token, we can write a method to retrieve the JSON object containing all our secrets in our Vault path.
```java
    private JsonNode retrieveVaultSecrets(String vaultClientToken) {
        URI vaultSecretsPath = URI.create("https://vault.mywebsite.com:8200/v1/mySecretsPath")
        HttpHeaders httpHeaders = new HttpHeaders();
        headers.put("X-Vault-Token", Collections.singletonList(vaultToken));
        HttpEntity<String> requestEntity = new HttpEntity<>(null, httpHeaders);
        ResponseEntity<JsonNode> responseEntity = restTemplate.exchange(vaultSecretsPath, HttpMethod.GET, request, JsonNode.class);
        return Objects.requireNonNull(response.getBody()).get("data");
    }
```

We're halfway there! But we can't use this JsonNode directly, we'll need to convert it to a `java.util.Properties` object next.
```java
    private Properties convertSecretsToSpringProperties(JsonNode vaultSecrets) {
        Properties properties = new Properties();
        for(Iterator<Map.Entry<String, JsonNode>> iterator = vaultSecrets.fields(); iterator.hasNext();){
            Map.Entry<String, JsonNode> secret = iterator.next();
            properties.put(secret.getKey(), secret.getValue().textValue());
        }
        return properties;
    }
```

Let's put it all together now and write a public method for our other classes to use. In the code below, we're assuming we've set the environment variables myVaultUsername and myVaultPassword with our vault username and password.
```java
package org.john.example.config;

import org.springframework.http.*;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.util.*;

public class VaultRetrievalUtil{
    RestTemplate restTemplate = new RestTemplate();

    public Properties retrieveVaultProperties(){
        String vaultUsername = System.getenv("myVaultUsername");
        String vaultPassword = System.getenv("myVaultPassword");

        if(vaultUsername != null && vaultPassword != null){
            String vaultClientToken = retrieveVaultClientToken(vaultUsername, vaultPassword);
            JsonNode vaultSecrets = retrieveVaultSecrets(vaultClientToken);
            return convertSecretsToSpringProperties(vaultSecrets);
        }
        else{
            /* Assuming if these credentials are not set, the user doesn't need credentials from Vault. 
            Alternatively, we could throw an exception if they're required for the application to work. */
            return new Properties();
        }
    }   

    private String retrieveVaultClientToken(String vaultUsername, String vaultPassword) {
        String requestBody = "{\\"password\":\\"" + vaultPassword + "\"}";
        URI vaultLoginUri = URI.create("https://vault.mywebsite.com:8200/v1/auth/ldap/login/" + vaultUsername);
        RequestEntity<String> requestEntity = new RequestEntity<>(requestBody, HttpMethod.POST, vaultLoginUri);
        ResponseEntity<JsonNode> responseEntity = restTemplate.exchange(requestEntity, JsonNode.class);
        return Objects.requireNonNull(respone.getBody()).get("auth").get("client_token").asText();
    }

    private JsonNode retrieveVaultSecrets(String vaultClientToken) {
        URI vaultSecretsPath = URI.create("https://vault.mywebsite.com:8200/v1/mySecretsPath")
        HttpHeaders httpHeaders = new HttpHeaders();
        headers.put("X-Vault-Token", Collections.singletonList(vaultToken));
        HttpEntity<String> requestEntity = new HttpEntity<>(null, httpHeaders);
        ResponseEntity<JsonNode> responseEntity = restTemplate.exchange(vaultSecretsPath, HttpMethod.GET, request, JsonNode.class);
        return Objects.requireNonNull(response.getBody()).get("data");
    }

    private Properties convertSecretsToSpringProperties(JsonNode vaultSecrets) {
        Properties properties = new Properties();
        for(Iterator<Map.Entry<String, JsonNode>> iterator = vaultSecrets.fields(); iterator.hasNext();){
            Map.Entry<String, JsonNode> secret = iterator.next();
            properties.put(secret.getKey(), secret.getValue().textValue());
        }
        return properties;
    }
}

```
That's it for now! Next we'll inject these properties into our application
#### Injecting Spring properties into our application
This part is simple, we'll create an instance of our VaultRetrievalUtil, then set the properties we retrieve from that class as the defaults in our main class. This means they can still be overridden if the user specifically chooses to define them elsewhere.
```java
package org.john.example;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.john.example.config.VaultRetrievalUtil;

@SpringBootApplication
public class Application{
    public static void main(String[] args){
        VaultRetrievalUtil vaultRetrievalUtil = new VaultRetrievalUtil();
        SpringApplication application = new SpringApplication(Application.class);
        application.setDefaultProperties(vaultRetrievalUtil.retrieveVaultProperties());
        
        application.run(args);
    }
}
```

That's it! All of the properties in our Vault path are now accessible while the application is running. You can retrieve them like any Spring properties now, for example:
```java
public class consumingClass{
    @Value("usernameToCallAnotherApi")
    private String usernameToCallAnotherApi;

    @Value("passwordToCallAnotherApi")
    private String passwordToCallAnotherApi;
    
    ...
}
```

#### Conclusion
You probably don't want to use this solution exactly in a production environment because it's insecure, especially if anyone else has access to your server. But for use locally, it should be fine, and avoids the possibility of accidentally committing credentials to source control.

Questions? Feedback? Please open a GitHub issue [here](https://github.com/johnl-m/personal-site/issues)