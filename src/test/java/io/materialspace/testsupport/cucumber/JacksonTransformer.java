package io.materialspace.testsupport.cucumber;

import io.cucumber.java.DefaultDataTableCellTransformer;
import io.cucumber.java.DefaultDataTableEntryTransformer;
import io.cucumber.java.DefaultParameterTransformer;
import io.materialspace.framework.json.ObjectMapperUtils;

import java.lang.reflect.Type;

public class JacksonTransformer {
    @DefaultParameterTransformer
    @DefaultDataTableCellTransformer(replaceWithEmptyString = "<empty>")
    @DefaultDataTableEntryTransformer(replaceWithEmptyString = "<empty>")
    public Object transformer(Object fromValue, Type toValueType) {
        return ObjectMapperUtils.convertValue(fromValue, toValueType);
    }
}
